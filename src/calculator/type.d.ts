/*
 * @Author: tackchen
 * @Date: 2022-09-15 08:33:57
 * @Description: Coding something
 */

export interface IHousingFundRange {
    min: number;
    max: number;
}

export interface IStockOption {
    value: number; // 每年期权总价值
    separateTax: boolean; // 期权单独计税 (default: false, 20% flat tax if true)
    vesting: number[]; // 期权月归属比例 (12 values, sum <= 100)
    buybackMonth: number; // 回购月份 (1-12)
}

export interface IStock {
    value: number; // 每年股票总价值
}

export interface IInsuranceAndFund {
    pension: number;
    medicalInsurance: number;
    unemploymentInsurance: number;
    injuryInsurance: number;
    maternityInsurance: number;
    housingFund: number;
    supplementaryFund: number;
}

export type IInsuranceAndFundOptions = Partial<IInsuranceAndFund>;

export interface IInsuranceAndFundResult extends IInsuranceAndFund {
    totalFund: number; // 总五险一金
    totalHousingFund: number; // 总住房公积金
}

// export type TInsuranceKey = keyof IInsuranceAndFundResult;

export interface ICalculateData<T = IInsuranceAndFund> {
    salary: number;
    specialAdditionalDeduction: number;
    yearEndAwardsNumber: number; // 年终奖月数
    yearEndAwards: number; // 年终奖总数 优先级高于yearEndAwardsNumber，当为0时则使用yearEndAwardsNumber计算
    insuranceAndFundBase: number;
    startingSalary: number;
    insuranceAndFundRate: T;
    insuranceAndFundRateOfCompany: T ;
    signingBonus: number[];
    housingFundRange: IHousingFundRange;
    stockOption: IStockOption; // 期权配置
    stock: IStock; // 股票配置
}

export type ICalculateOptions = Partial<ICalculateData<IInsuranceAndFundOptions>>;

export type ILevels = {
    value: number;
    rate: number;
    deduction: number;
}[]

export interface ICalculateResult {
    salaryBase: number;
    salaryPreTax: number[];
    salaryAfterTax: number[];
    salaryAfterTaxAvg: number;
    salaryTax: number[];
    salaryTotalTax: number;
    totalSalaryAfterTaxExcludeAwards: number;
    totalSalaryPreTax: number;
    totalSalaryAfterTax: number;
    insuranceAndFund: IInsuranceAndFundResult;
    insuranceAndFundOfCompany: IInsuranceAndFundResult;
    awardsPreTax: number;
    awardsTax: number;
    awardsAfterTax: number;
    stockOptionPreTax: number; // 期权税前金额
    stockOptionTax: number; // 期权税额
    stockOptionAfterTax: number; // 期权税后金额
    stockPreTax: number; // 股票税前金额
    stockTax: number; // 股票税额
    stockAfterTax: number; // 股票税后金额
}

export class Salary implements ICalculateData {
    salary: number; // 基础工资
    specialAdditionalDeduction: number; // 每月专项附加扣除 租房扣除
    yearEndAwardsNumber: number; // 年终奖月数
    yearEndAwards: number; // 年终奖 0表示默认使用 年终奖月数
    insuranceAndFundBase: number; // 五险一金计算基础，为上一年度平均薪资，默认为salary
    startingSalary: number; // 个税起征点
    insuranceAndFundRate: IInsuranceAndFund;
    insuranceAndFundRateOfCompany: IInsuranceAndFund;
    signingBonus: number[]; // 每月额外奖金
    housingFundRange: IHousingFundRange; // 公积金计算上下限
    stockOption: IStockOption; // 期权配置
    stock: IStock; // 股票配置

    salaryResult: ICalculateResult;

    constructor (options?: Partial<ICalculateData>);
    count (): ICalculateResult;
}