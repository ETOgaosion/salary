/*
 * @Author: tackchen
 * @Date: 2022-09-16 08:33:12
 * @Description: Coding something
 */

/*
累计应纳税所得额 = 累计应税收入 - 累计免税收入 - 累计减除费用 - 累计专项扣除 - 累计专项附加扣除 - 累计依法确定的其他扣除

累计应税收入 : 月薪 * 月数
累计免税收入 : 无 （这部分不清楚，目前当0处理）
累计减除费用 = 起征点（ 上海为5000） * 月数
累计专项扣除 = 五险一金 * 月数 = 月薪 * 五险一金比例 * 月数
累计专项附加扣除 = 专项扣除数值 * 月数

累计依法确定的其他扣除 = 无 （这部分不清楚，目前当0处理）
累计应纳税所得额 = (月薪 - 0 - 起征点 - 月薪 * 五险一金比例 - 专项扣除数值 - 0) * 月数

当月个税 = （累计应纳税所得额 * 预扣率 - 速算扣除数）- 累计减免税额【0】 - 累计已缴税额
 */

import {calculateInsuranceAndFund} from './fund';
import {calculatePersionalIncomeTax} from './tax';
import {calculateYearEndAwardsTax} from './award';
import {ICalculateData, ICalculateResult} from './index.d';
import {avgArray, sumArray} from './utils';

function fillExtraBonus (signingBonus: number | number[]) {
    if (typeof signingBonus === 'number') {
        const value = signingBonus;
        signingBonus = new Array(12);
        signingBonus.fill(value);
    } else {
        for (let i = signingBonus.length; i < 12; i++) {
            signingBonus[i] = 0;
        }
    }
    return signingBonus;
}

function fillStockOptionVesting (vesting: number | number[]): number[] {
    if (typeof vesting === 'number') {
        // Single number means equal distribution
        const value = vesting;
        vesting = new Array(12);
        vesting.fill(value / 12);
    } else {
        // Pad with zeros to 12 months
        for (let i = vesting.length; i < 12; i++) {
            vesting[i] = 0;
        }
    }
    return vesting;
}

// 股票税计算 (使用个人所得税税率表一 - 综合所得适用)
// 应纳税额 = 股票应纳税所得额 × 适用税率 - 速算扣除数
function calculateStockTax (stock: ICalculateData['stock']): {
    stockPreTax: number;
    stockTax: number;
    stockAfterTax: number;
} {
    const { value } = stock;

    if (value <= 0) {
        return { stockPreTax: 0, stockTax: 0, stockAfterTax: 0 };
    }

    const stockPreTax = value;

    // 个人所得税税率表一（综合所得适用）- 全年应纳税所得额
    const levels = [
        {value: 36000, rate: 0.03, deduction: 0},
        {value: 144000, rate: 0.1, deduction: 2520},
        {value: 300000, rate: 0.2, deduction: 16920},
        {value: 420000, rate: 0.25, deduction: 31920},
        {value: 660000, rate: 0.3, deduction: 52920},
        {value: 960000, rate: 0.35, deduction: 85920},
        {value: 0, rate: 0.45, deduction: 181920},
    ];

    let rate = 0;
    let deduction = 0;
    for (const level of levels) {
        if (level.value === 0 || stockPreTax <= level.value) {
            rate = level.rate;
            deduction = level.deduction;
            break;
        }
    }

    // 应纳税额 = 股票应纳税所得额 × 适用税率 - 速算扣除数
    const stockTax = stockPreTax * rate - deduction;

    return {
        stockPreTax,
        stockTax: Math.max(0, stockTax),
        stockAfterTax: stockPreTax - Math.max(0, stockTax),
    };
}

function calculateStockOptionTax (stockOption: ICalculateData['stockOption']): {
    stockOptionPreTax: number;
    stockOptionTax: number;
    stockOptionAfterTax: number;
    stockOptionIncome: number; // Amount to add to salary if combined tax
    stockOptionBuybackMonth: number;
} {
    const { value, separateTax, vesting, buybackMonth } = stockOption;

    // Fill vesting array to 12 months
    const vestingArray = fillStockOptionVesting(vesting);

    // Calculate vested amount by buyback month
    let vestedPercentage = 0;
    for (let i = 0; i < buybackMonth && i < 12; i++) {
        vestedPercentage += vestingArray[i];
    }
    // Cap at 100%
    vestedPercentage = Math.min(vestedPercentage, 100);

    const stockOptionPreTax = value * vestedPercentage / 100;

    let stockOptionTax = 0;
    let stockOptionIncome = 0;

    if (separateTax) {
        // 20% flat tax
        stockOptionTax = stockOptionPreTax * 0.2;
    } else {
        // Will be added to salary income for cumulative tax
        stockOptionIncome = stockOptionPreTax;
    }

    const stockOptionAfterTax = stockOptionPreTax - stockOptionTax;

    return {
        stockOptionPreTax,
        stockOptionTax,
        stockOptionAfterTax,
        stockOptionIncome,
        stockOptionBuybackMonth: buybackMonth,
    };
}

export function calculateSalary ({
    salary, //
    specialAdditionalDeduction, // 每月专项附加扣除 租房扣除
    yearEndAwardsNumber, // 年终奖月数
    yearEndAwards, // 年终奖
    insuranceAndFundBase, // 五险一金计算基础，为上一年度平均薪资，默认为salary
    startingSalary, // 个税起征点
    insuranceAndFundRate,
    insuranceAndFundRateOfCompany,
    signingBonus, // 每月额外奖金
    housingFundRange, // 公积金计算上下限
    stockOption, // 期权配置
    stock, // 股票配置
}: ICalculateData): ICalculateResult {

    signingBonus = fillExtraBonus(signingBonus);

    // 计算期权
    const stockOptionResult = calculateStockOptionTax(stockOption);

    // 计算股票
    const stockResult = calculateStockTax(stock);

    // If not separate tax, add stock option income to the buyback month's signing bonus
    if (!stockOption.separateTax && stockOptionResult.stockOptionIncome > 0) {
        const buybackIndex = Math.min(Math.max(stockOption.buybackMonth - 1, 0), 11);
        signingBonus[buybackIndex] += stockOptionResult.stockOptionIncome;
    }

    // 对部分数据附默认值
    const shapedData = initRelatedParameter({
        salary,
        insuranceAndFundBase,
        insuranceAndFundRate,
        insuranceAndFundRateOfCompany
    });
    insuranceAndFundBase = shapedData.insuranceAndFundBase;
    insuranceAndFundRateOfCompany = shapedData.insuranceAndFundRateOfCompany;

    // 计算年终奖
    const {awardsPreTax, awardsTax, awardsAfterTax} = calculateYearEndAwardsTax({
        salary,
        yearEndAwards,
        yearEndAwardsNumber,
        startingSalary,
    });

    // 计算五险一金
    const insuranceAndFund = calculateInsuranceAndFund({
        insuranceAndFundBase,
        insuranceAndFundRate,
        housingFundRange,
    });

    // 计算五险一金 公司缴费部分
    const insuranceAndFundOfCompany = calculateInsuranceAndFund({
        insuranceAndFundBase,
        insuranceAndFundRate: insuranceAndFundRateOfCompany,
        housingFundRange,
    });

    const {
        salaryAfterTax,
        salaryTax,
        totalSalaryAfterTaxExcludeAwards,
        salaryTotalTax,
        totalSalaryAfterTax
    } = accumulateCalculate({
        salary,
        signingBonus,
        startingSalary,
        specialAdditionalDeduction,
        totalFund: insuranceAndFund.totalFund,
        awardsAfterTax,
    });
    return {
        salaryBase: salary, // 月基础工资
        salaryPreTax: signingBonus.map(v => v + salary), // 税前月薪
        salaryAfterTax, // 每月税后收入
        salaryAfterTaxAvg: avgArray(salaryAfterTax),
        salaryTax, // 每月个人所得税
        salaryTotalTax,
        totalSalaryAfterTaxExcludeAwards, // 除去年终奖总收入
        totalSalaryPreTax: awardsPreTax + salary * 12 + sumArray(signingBonus) + (stockOption.separateTax ? stockOptionResult.stockOptionPreTax : 0) + stockResult.stockPreTax, // 税前年总收入
        totalSalaryAfterTax: totalSalaryAfterTax + (stockOption.separateTax ? stockOptionResult.stockOptionAfterTax : 0) + stockResult.stockAfterTax, // 税后年总收入
        insuranceAndFund, // 五险一金
        insuranceAndFundOfCompany,
        awardsPreTax, // 税前年终奖
        awardsTax,
        awardsAfterTax, // 税后年终奖
        stockOptionPreTax: stockOptionResult.stockOptionPreTax, // 期权税前金额
        stockOptionTax: stockOptionResult.stockOptionTax, // 期权税额
        stockOptionAfterTax: stockOptionResult.stockOptionAfterTax, // 期权税后金额
        stockPreTax: stockResult.stockPreTax, // 股票税前金额
        stockTax: stockResult.stockTax, // 股票税额
        stockAfterTax: stockResult.stockAfterTax, // 股票税后金额
    };
}

function initRelatedParameter ({
    salary,
    insuranceAndFundBase,
    insuranceAndFundRate,
    insuranceAndFundRateOfCompany,
}: Pick<
    ICalculateData,
    'salary' | 'insuranceAndFundBase' | 'insuranceAndFundRateOfCompany' | 'insuranceAndFundRate'
>): Pick<
    ICalculateData,
    'insuranceAndFundBase' | 'insuranceAndFundRateOfCompany'
> {
    if (!insuranceAndFundBase) insuranceAndFundBase = salary;

    const companyRate = Object.assign({}, insuranceAndFundRateOfCompany);

    if (companyRate.housingFund === -1) {
        companyRate.housingFund = insuranceAndFundRate.housingFund;
    }

    if (companyRate.supplementaryFund === -1) {
        companyRate.supplementaryFund = insuranceAndFundRate.supplementaryFund;
    }

    return {
        insuranceAndFundBase,
        insuranceAndFundRateOfCompany: companyRate
    };
}

// 累计计算过程
function accumulateCalculate ({
    salary,
    signingBonus,
    startingSalary,
    specialAdditionalDeduction,
    totalFund,
    awardsAfterTax,
}: Pick<
    ICalculateData,
    'salary' | 'signingBonus' | 'startingSalary' | 'specialAdditionalDeduction'
> & {
    totalFund: number; // 每月累计专项扣除 就是个人缴纳的五险一金
    awardsAfterTax: number;
}): Pick<
    ICalculateResult,
    'salaryAfterTax' | 'salaryTax' | 'totalSalaryAfterTaxExcludeAwards' | 'salaryTotalTax' | 'totalSalaryAfterTax'
> {
    const salaryAfterTax: number[] = [];
    const salaryTax: number[] = [];
    
    let totalPersonalTncomeTax = 0; // 累计个人所得税缴税额

    let cumulativeExtraBonus = 0;

    for (let i = 1; i < 13; i++) {

        const curretBonus = ((signingBonus as number[])[i - 1] || 0);
        cumulativeExtraBonus += curretBonus;

        const cumulativePreTaxIncome = i * salary + cumulativeExtraBonus; // 累计应税收入 todo 额外津贴奖金
        const accumulatedTaxFreeIncome = 0; // 累计免税收入 todo
        const cumulativeDeductions = startingSalary * i; // 累计减除费用
        const cumulativeSpecialDeduction = totalFund * i; // 累计专项扣除
        const accumulatedSpecialAdditionalDeductions = specialAdditionalDeduction * i; // 累计专项附加扣除
        const others = 0; // todo
        // 累计应纳税所得额 = 累计应税收入 - 累计免税收入 - 累计减除费用 - 累计专项扣除 - 累计专项附加扣除 - 累计依法确定的其他扣除
        const accumulatedTaxableIncome =  // 累计应纳税所得额
            cumulativePreTaxIncome - accumulatedTaxFreeIncome - cumulativeDeductions -
            cumulativeSpecialDeduction - accumulatedSpecialAdditionalDeductions - others;

        const singleSalaryTax = calculatePersionalIncomeTax({
            accumulatedTaxableIncome,
            totalPersonalTncomeTax
        }); // 当月个人所得税

        const singleSalaryAfterTax = salary + curretBonus - totalFund - singleSalaryTax;
        salaryAfterTax.push(singleSalaryAfterTax);
        salaryTax.push(singleSalaryTax);
        totalPersonalTncomeTax += singleSalaryTax; // 累计个人所得税缴税额
    }

    const totalSalaryAfterTaxExcludeAwards = sumArray(salaryAfterTax);
    const salaryTotalTax = sumArray(salaryTax);

    return {
        salaryAfterTax,
        salaryTax,
        totalSalaryAfterTaxExcludeAwards,
        salaryTotalTax,
        totalSalaryAfterTax: totalSalaryAfterTaxExcludeAwards + awardsAfterTax
    };
}
