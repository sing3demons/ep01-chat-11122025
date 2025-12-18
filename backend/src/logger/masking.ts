import crypto from "crypto";


type MaskingOptionDto = {
    maskingType: string;
    maskingField: string;
    isArray?: boolean;
}
type BuiltInMaskingType = "full" | "first" | "last" | "hash";



export interface MaskPatternRule {
    condition_reg: string;
    mask_pattern: string;
}

export interface MaskingConfig {
    [key: string]: MaskPatternRule[];
}

const defaultConfig = {
    "password": [
        {
            "condition_reg": "^.+$",
            "mask_pattern": "**********"
        }
    ],
    "msisdn": [
        { condition_reg: "^(0)(\\d){9}$", mask_pattern: "*000xxx0000" },
        { condition_reg: "^(66)(\\d){9}$", mask_pattern: "0000xxx*" },
        { condition_reg: "^(85620)(\\d){8}$", mask_pattern: "0000xxx0000*" }
    ],
    "email": [
        {
            condition_reg:
                '^(([^<>()\\[\\]\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\.,;:\\s@"]+)*)|(".+"))@[a-zA-Z0-9]+(?:\\.[a-zA-Z0-9-]{2,})*$',
            mask_pattern: "000xx@xxx.xx.xx"
        }
    ],
    "idcard": [
        {
            "condition_reg": "^[1-8]\\d{12}$",
            "mask_pattern": "0XXXXXXXXXXXX"
        }
    ],
    "passport": [
        {
            "condition_reg": "^[A-Z]{1,2}\\d{6,8}$",
            "mask_pattern": "00XXXXXXX"
        }
    ],
    "creditcard": [
        {
            "condition_reg": "^(?:4\\d{12}(\\d{3})?|5[1-5]\\d{14}|3[47]\\d{13}|6\\d{15})$",
            "mask_pattern": "000000XXXXXX0000"
        }
    ],
    "account_no": [
        {
            "condition_reg": "^\\d{10,12}$",
            "mask_pattern": "00XXXXXXXX00"
        }
    ],
    "tax_id": [
        {
            "condition_reg": "^\\d{13}$",
            "mask_pattern": "000XXXXXXXX00"
        }
    ]
} as const

type SpecialMaskingType = "full" | "first" | "last" | "hash";

export type MaskingType = keyof typeof defaultConfig | SpecialMaskingType;

export interface MaskingRule {
    maskingType: MaskingType | "none" | "custom_type"
    maskingField: string; // เช่น body.email | body.$.email | $.body.email
    isArray?: boolean;
}

export class MaskingService {
    // ✅ Cache compiled RegExp เพื่อไม่ต้องสร้างใหม่ทุกครั้ง
    private regexCache: Map<string, RegExp> = new Map();

    constructor(private readonly config: MaskingConfig = defaultConfig as unknown as MaskingConfig) { }

    // ✅ เพิ่ม method สำหรับ cache RegExp
    private getRegExp(pattern: string): RegExp {
        let regex = this.regexCache.get(pattern);
        if (!regex) {
            regex = new RegExp(pattern);
            this.regexCache.set(pattern, regex);
        }
        return regex;
    }

    // =========================
    // ✅ Public API
    // =========================
    mask<T>(data: T, rules: MaskingRule[]): T {
        for (const rule of rules) {
            this.applyRule(data as any, rule);
        }

        return data;
    }

    static maskData<T>(data: T, rules: MaskingRule[], config: MaskingConfig = defaultConfig as unknown as MaskingConfig): T {
        const masker = new MaskingService(config);
        const clonedData = JSON.parse(JSON.stringify(data));
        return masker.mask(clonedData, rules);
    }

    // =========================
    // ✅ Core Path Logic
    // =========================
    private applyRule(data: any, rule: MaskingRule): void {
        const { maskingType, maskingField, isArray } = rule;
        const parts = maskingField.split(".");

        // ✅ CASE 1: root array → $.body.email
        if (parts[0] === "$") {
            if (!Array.isArray(data)) return;
            const subPath = parts.slice(1).join(".");
            for (const item of data) {
                this.processValue(item, subPath, maskingType, isArray);
            }
            return;
        }

        // ✅ CASE 2: array in middle → body.$.email
        if (maskingField.includes(".$.")) {
            const [arrayPath, fieldPath] = maskingField.split(".$.");
            if (!arrayPath || !fieldPath) return;
            const arr = this.getByPath(data, arrayPath);
            if (!Array.isArray(arr)) return;

            for (const item of arr) {
                this.processValue(item, fieldPath, maskingType, isArray);
            }
            return;
        }

        // ✅ CASE 3: normal path
        this.processValue(data, maskingField, maskingType, isArray);
    }

    private processValue(
        target: any,
        path: string,
        type: string,
        isArray: boolean = false
    ): void {
        const value = this.getByPath(target, path);
        if (!value) return;

        const masked = isArray && Array.isArray(value)
            ? value.map(v => this.maskValue(type, v))
            : this.maskValue(type, value);

        this.setByPath(target, path, masked);
    }

    // =========================
    // ✅ Mask Dispatcher
    // =========================
    private maskValue(type: string, value: any): any {
        if (!value || typeof value !== "string") return value;

        // ✅ Built-in mask mode
        switch (type) {
            case "full":
                return this.maskFull(value);
            case "first":
                return this.maskFirst(value);
            case "last":
                return this.maskLast(value);
            case "hash":
                return this.maskHash(value);
        }

        // ✅ Config-based mask (email, msisdn, etc.)
        const rules = this.config[type];
        if (!rules) return value;

        for (const rule of rules) {
            const reg = this.getRegExp(rule.condition_reg); // ✅ ใช้ cached RegExp
            if (reg.test(value)) {
                return this.maskByPattern(value, rule.mask_pattern);
            }
        }

        return value;
    }

    // =========================
    // ✅ Built-in Masking
    // =========================

    // 👉 full → ***** 
    private maskFull(value: string): string {
        return "*".repeat(value.length);
    }

    // 👉 first → a****
    private maskFirst(value: string): string {
        return value[0] + "*".repeat(value.length - 1);
    }

    // 👉 last → ****z
    private maskLast(value: string): string {
        return "*".repeat(value.length - 1) + value[value.length - 1];
    }

    // 👉 hash → sha256
    private maskHash(value: string): string {
        return crypto
            .createHash("sha256")
            .update(value)
            .digest("hex");
    }

    // =========================
    // ✅ Pattern Masking
    // =========================
    private maskByPattern(value: string, pattern: string): string {
        const result: string[] = [];
        let valueIndex = 0;
        const valueLen = value.length;
        const patternLen = pattern.length;

        for (let i = 0; i < patternLen; i++) {
            const ch = pattern[i]!;
            if (ch === "0") {
                if (valueIndex < valueLen) {
                    result.push(value[valueIndex]!);
                }
                valueIndex++;
            }
            else if (ch === "x" || ch === "X" || ch === "*") {
                result.push(ch);
                valueIndex++;
            }
            else {
                result.push(ch);
                const pos = value.indexOf(ch, valueIndex);
                if (pos !== -1) valueIndex = pos + 1;
            }
        }

        return result.join("");
    }

    // =========================
    // ✅ Path Utils
    // =========================
    private getByPath(obj: any, path: string): any {
        return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    }

    private setByPath(obj: any, path: string, value: any): void {
        const keys = path.split(".");
        const last = keys.pop()!;
        const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
        target[last] = value;
    }
}