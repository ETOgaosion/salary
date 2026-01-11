/*
 * @Author: tackchen
 * @Date: 2022-09-18 09:55:36
 * @Description: Coding something
 */

import Salary from '../calculator';
import {toast} from './toast';
import {IMapInfo, TEXT_MAP, RESULT_TEXT_MAP} from './map';

export class UI {
    inputArea: HTMLDivElement;
    resultArea: HTMLDivElement;

    salary: Salary;

    emitResultList: Function[] = [];
    necEls: HTMLElement[] = [];

    constructor () {
        this.salary = new Salary();
        this.inputArea = window.document.querySelector('.input-area') as HTMLDivElement;
        this.resultArea = window.document.querySelector('.result-area') as HTMLDivElement;
        this._initInputUI();
        this._initResultUI();
        this._calculate();
    }

    private _calculate () {
        this.salary.calculate();
        this.emitResultList.forEach(fn => fn());
    }

    private _initInputUI () {

        const fragment = this._createFragmentCommon({
            map: TEXT_MAP,
            isInput: true,
        });
        this.inputArea.appendChild(fragment);

        const more = this._ce('div', 'input-more');
        const span = this._ce('span', '');
        const i = this._ce('i', 'ei-tasks');
        more.appendChild(i);
        more.appendChild(span);
        span.innerText = '五险一金详细信息';

        more.onclick = () => {
            if (span.innerText === '五险一金详细信息') {
                span.innerText = '收起五险一金详细信息';
                this.necEls.forEach(el => el.classList.add('show'));
            } else {
                span.innerText = '五险一金详细信息';
                this.necEls.forEach(el => el.classList.remove('show'));
            }
        };
        this.inputArea.appendChild(more);

        // Calculate button
        const calcBtn = this._ce('button', 'calc-btn');
        calcBtn.innerText = '计算';
        calcBtn.onclick = () => {
            this._calculate();
            toast('计算结果已更新');
        };
        this.inputArea.appendChild(calcBtn);
    }

    private _initResultUI () {
        const fragment = this._createFragmentCommon({
            map: RESULT_TEXT_MAP,
            isInput: false,
        });
        this.resultArea.appendChild(fragment);
    }

    private _createWrapper (map: IMapInfo, isInput: boolean) {
        const div = this._ce('div', 'salary-wrapper');
        const title = this._ce('div', 'salary-wrapper-title');
        this._checkNec(div, isInput, map.nec);
        title.innerText = map.text;
        div.appendChild(title);
        return div;
    }

    private _checkNec (el: HTMLElement, isInput: boolean, nec = false) {
        if (isInput && !nec) {
            el.classList.add('salary-not-nec');
            this.necEls.push(el);
        }
    }

    private _createSingleItem ({
        key,
        item,
        subKey,
        isInput = true
    }: {
        key: string,
        item: IMapInfo,
        subKey?: string,
        isInput?: boolean
    }) {
        const div = this._ce('div', 'salary-item');
        const title = this._ce('span', 'salary-title');
        title.innerText = item.text;
        div.appendChild(title);

        const salary = this.salary as any;

        if (isInput) {
            this._checkNec(div, isInput, item.nec);

            const value = salary[key];
            // Fields that accept space-separated arrays
            const arrayFields = ['signingBonus'];
            const nestedArrayFields = [{key: 'stockOption', subKey: 'vesting'}];
            const nestedBooleanFields = [{key: 'stockOption', subKey: 'separateTax'}];

            const isArrayField = arrayFields.includes(key) ||
                nestedArrayFields.some(f => f.key === key && f.subKey === subKey);
            const isBooleanField = nestedBooleanFields.some(f => f.key === key && f.subKey === subKey);

            if (isBooleanField) {
                // Checkbox for boolean fields
                const input = this._ce('input', 'salary-checkbox') as HTMLInputElement;
                input.type = 'checkbox';
                input.checked = subKey ? value[subKey] : value;

                input.onchange = () => {
                    if (subKey) {
                        salary[key][subKey] = input.checked;
                    } else {
                        salary[key] = input.checked;
                    }
                };
                div.appendChild(input);
                // Add info icon for boolean fields
                if (item.info || item.url) {
                    const info = this._ce('i', 'ei-info-sign');
                    const infoStr = item.info || '查看详情';
                    info.title = infoStr;
                    if (item.url) {
                        info.onclick = () => {window.open((item.url as string).substring(4));};
                    } else {
                        info.onclick = () => {toast(infoStr || '', 5000);};
                    }
                    div.appendChild(info);
                }
            } else if (isArrayField) {
                // Add info icon after title for array fields
                if (item.info || item.url) {
                    const info = this._ce('i', 'ei-info-sign');
                    const infoStr = item.info || '查看详情';
                    info.title = infoStr;
                    if (item.url) {
                        info.onclick = () => {window.open((item.url as string).substring(4));};
                    } else {
                        info.onclick = () => {toast(infoStr || '', 5000);};
                    }
                    div.appendChild(info);
                }
                // Expandable table for array fields
                const container = this._ce('div', 'array-container');
                const entriesDiv = this._ce('div', 'array-entries');
                container.appendChild(entriesDiv);

                const currentArray: number[] = subKey ? value[subKey] : value;

                const collectData = () => {
                    const result: number[] = new Array(12).fill(0);
                    const rows = entriesDiv.querySelectorAll('.array-row');
                    rows.forEach((row) => {
                        const monthSelect = row.querySelector('.array-month') as HTMLSelectElement;
                        const valueInput = row.querySelector('.array-value') as HTMLInputElement;
                        const month = parseInt(monthSelect.value) - 1;
                        const val = parseFloat(valueInput.value) || 0;
                        if (month >= 0 && month < 12) {
                            result[month] = val;
                        }
                    });
                    if (subKey) {
                        salary[key][subKey] = result;
                    } else {
                        salary[key] = result;
                    }
                };

                const addRow = (month: number = 1, val: number = 0) => {
                    const row = this._ce('div', 'array-row');

                    const monthSelect = this._ce('select', 'array-month') as HTMLSelectElement;
                    for (let m = 1; m <= 12; m++) {
                        const opt = this._ce('option') as HTMLOptionElement;
                        opt.value = String(m);
                        opt.innerText = m + '月';
                        monthSelect.appendChild(opt);
                    }
                    monthSelect.value = String(month);
                    monthSelect.onchange = collectData;

                    const valueInput = this._ce('input', 'array-value') as HTMLInputElement;
                    valueInput.type = 'number';
                    valueInput.value = String(val);
                    valueInput.onchange = collectData;

                    const unit = this._ce('span', 'array-unit');
                    unit.innerText = item.unit || '';

                    const delBtn = this._ce('span', 'array-del');
                    delBtn.innerText = '×';
                    delBtn.onclick = () => {
                        row.remove();
                        collectData();
                    };

                    row.appendChild(monthSelect);
                    row.appendChild(valueInput);
                    row.appendChild(unit);
                    row.appendChild(delBtn);
                    entriesDiv.appendChild(row);
                };

                // Initialize with existing data
                if (Array.isArray(currentArray)) {
                    currentArray.forEach((val, idx) => {
                        if (val !== 0) {
                            addRow(idx + 1, val);
                        }
                    });
                }

                const addBtn = this._ce('span', 'array-add');
                addBtn.innerText = '+';
                addBtn.onclick = () => addRow();
                container.appendChild(addBtn);

                div.appendChild(container);
            } else {
                const input = this._ce('input', 'salary-input') as HTMLInputElement;
                input.value = subKey ? value[subKey] : value;
                input.type = 'number';

                input.onchange = () => {
                    const inputValue = parseFloat(input.value);
                    if (subKey) {
                        salary[key][subKey] = inputValue;
                    } else {
                        salary[key] = inputValue;
                    }
                };
                div.appendChild(input);
                if (item.unit) {
                    const span = this._ce('span', 'salary-unit');
                    span.innerText = item.unit;
                    div.appendChild(span);
                }
                // Add info icon for number fields
                if (item.info || item.url) {
                    const info = this._ce('i', 'ei-info-sign');
                    const infoStr = item.info || '查看详情';
                    info.title = infoStr;
                    if (item.url) {
                        info.onclick = () => {window.open((item.url as string).substring(4));};
                    } else {
                        info.onclick = () => {toast(infoStr || '', 5000);};
                    }
                    div.appendChild(info);
                }
            }
        } else {
            const result = this._ce('span', 'salary-result') as HTMLInputElement;

            this.emitResultList.push(() => {
                const salaryResult = salary.salaryResult;
                let value = subKey ? salaryResult[key][subKey] : salaryResult[key];

                if (typeof value === 'number') {
                    value = value.toFixed(2) + '元';
                } else if (value instanceof Array) {
                    value = value.map((v, i) => {
                        return `[${i + 1}月:${v.toFixed(2)}元]`;
                    }).join(' ');
                }

                result.innerText = value;
            });
            div.appendChild(result);

            // Add info icon for non-input items
            if (item.info || item.url) {
                const info = this._ce('i', 'ei-info-sign');
                const infoStr = item.info || '查看详情';
                info.title = infoStr;
                if (item.url) {
                    info.onclick = () => {window.open((item.url as string).substring(4));};
                } else {
                    info.onclick = () => {toast(infoStr || '', 5000);};
                }
                div.appendChild(info);
            }
        }

        return div;
    }

    private _createFragmentCommon ({
        map,
        isInput = true,
    }: {
        map: {[prod in string]: any},
        isInput?: boolean
    }) {
        const fragment = window.document.createDocumentFragment();
        
        for (const key in map) {
            const value = (map as any)[key];
            let el: HTMLElement;
            if (value.base) {
                el = this._createSingleItem({key, item: value, isInput});
            } else {
                el = this._createWrapper(value, isInput);
                for (const k in value) {
                    const item = value[k];
                    if (k !== 'text' && k !== 'nec') {
                        el.appendChild(this._createSingleItem({key, subKey: k, item, isInput}));
                    }
                }
            }
            fragment.appendChild(el);
        }

        return fragment;
    }

    private _ce (name: string, className = '') {
        const el = window.document.createElement(name);
        if (className) el.className = className;
        return el;
    }
}