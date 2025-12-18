import { beforeEach, describe, expect, it } from "@jest/globals";
 import {  MaskingService, type MaskingRule } from "./masking.js";
describe("MaskingService", () => {
    let service: MaskingService;

    

    beforeEach(() => {
        service = new MaskingService();
    });

    // =====================================================
    // ✅ CASE 1: body.email (normal path)
    // =====================================================
    it("should mask email at body.email", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("tesxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 2: body.$.email (array in middle)
    // =====================================================
    it("should mask email in body.$.email", () => {
        const data = {
            body: [
                { email: "test@test.com" },
                { email: "hello@gmail.com" }
            ]
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.$.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body[0]?.email).toBe("tesxx@xxx.xx.xx");
        expect(data.body[1]?.email).toBe("helxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 3: $.body.email (root array)
    // =====================================================
    it("should mask email with root array $.body.email", () => {
        const data = [
            { body: { email: "test@test.com" } },
            { body: { email: "hello@gmail.com" } }
        ];

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "$.body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data[0]?.body?.email).toBe("tesxx@xxx.xx.xx");
        expect(data[1]?.body?.email).toBe("helxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 4: isArray = true
    // =====================================================
    it("should mask array of emails with isArray = true", () => {
        const data = {
            body: {
                email: ["test@test.com", "hello@gmail.com"]
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: true
            }
        ];

        service.mask(data, rules);

        expect(data.body.email[0]).toBe("tesxx@xxx.xx.xx");
        expect(data.body.email[1]).toBe("helxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 5: nested หลายชั้น
    // =====================================================
    it("should mask deep nested path body.users.$.profile.email", () => {
        const data = {
            body: {
                users: [
                    { profile: { email: "test@test.com" } },
                    { profile: { email: "hello@gmail.com" } }
                ]
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.users.$.profile.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.users[0]?.profile.email).toBe("tesxx@xxx.xx.xx");
        expect(data.body.users[1]?.profile.email).toBe("helxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 6: ไม่ match regex → ไม่ถูก mask
    // =====================================================
    it("should not mask if value does not match regex", () => {
        const data = {
            body: {
                email: "invalid-email-format"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("invalid-email-format");
    });

    // =====================================================
    // ✅ CASE 7: type ไม่อยู่ใน config → ไม่ mask
    // =====================================================
    it("should not mask if maskingType does not exist in config", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "none",
                maskingField: "body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("test@test.com");
    });

    // =====================================================
    // ✅ CASE 8: msisdn masking
    // =====================================================
    it("should mask msisdn correctly", () => {
        const data = {
            body: {
                phone: "0123456789"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "msisdn",
                maskingField: "body.phone",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.phone).toBe("*123xxx789");
    });

    // =====================================================
    // ✅ CASE 9: field ไม่ 존재 → ไม่ throw error
    // =====================================================
    it("should safely ignore missing field", () => {
        const data = {
            body: {}
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: false
            }
        ];

        expect(() => service.mask(data, rules)).not.toThrow();
        expect((data?.body as Record<string, unknown>)?.email).toBeUndefined();
    });

    // =====================================================
    // ✅ CASE 10: Built-in mask type "full"
    // =====================================================
    it("should mask with full type", () => {
        const data = {
            body: {
                secret: "password123"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "full",
                maskingField: "body.secret",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.secret).toBe("***********");
    });

    // =====================================================
    // ✅ CASE 11: Built-in mask type "first"
    // =====================================================
    it("should mask with first type", () => {
        const data = {
            body: {
                name: "JohnDoe"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "first",
                maskingField: "body.name",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.name).toBe("J******");
    });

    // =====================================================
    // ✅ CASE 12: Built-in mask type "last"
    // =====================================================
    it("should mask with last type", () => {
        const data = {
            body: {
                name: "JohnDoe"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "last",
                maskingField: "body.name",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.name).toBe("******e");
    });

    // =====================================================
    // ✅ CASE 13: Built-in mask type "hash"
    // =====================================================
    it("should mask with hash type", () => {
        const data = {
            body: {
                password: "secret123"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "hash",
                maskingField: "body.password",
                isArray: false
            }
        ];

        service.mask(data, rules);

        // SHA256 hash is 64 characters hex
        expect(data.body.password).toHaveLength(64);
        expect(data.body.password).toMatch(/^[a-f0-9]{64}$/);
    });

    // =====================================================
    // ✅ CASE 14: msisdn 66 prefix
    // =====================================================
    it("should mask msisdn with 66 prefix correctly", () => {
        const data = {
            body: {
                phone: "66123456789"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "msisdn",
                maskingField: "body.phone",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.phone).toBe("6612xxx*");
    });

    // =====================================================
    // ✅ CASE 15: msisdn 85620 prefix (Laos)
    // =====================================================
    it("should mask msisdn with 85620 prefix correctly", () => {
        const data = {
            body: {
                phone: "8562012345678"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "msisdn",
                maskingField: "body.phone",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.phone).toBe("8562xxx3456*");
    });

    // =====================================================
    // ✅ CASE 16: idcard masking
    // =====================================================
    it("should mask idcard correctly", () => {
        const data = {
            body: {
                idcard: "1234567890123"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "idcard",
                maskingField: "body.idcard",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.idcard).toBe("1XXXXXXXXXXXX");
    });

    // =====================================================
    // ✅ CASE 17: passport masking
    // =====================================================
    it("should mask passport correctly", () => {
        const data = {
            body: {
                passport: "AB1234567"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "passport",
                maskingField: "body.passport",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.passport).toBe("ABXXXXXXX");
    });

    // =====================================================
    // ✅ CASE 18: creditcard masking
    // =====================================================
    it("should mask creditcard correctly", () => {
        const data = {
            body: {
                card: "4111111111111111"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "creditcard",
                maskingField: "body.card",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.card).toBe("411111XXXXXX1111");
    });

    // =====================================================
    // ✅ CASE 19: account_no masking
    // =====================================================
    it("should mask account_no correctly", () => {
        const data = {
            body: {
                account: "1234567890"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "account_no",
                maskingField: "body.account",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.account).toBe("12XXXXXXXX");
    });

    // =====================================================
    // ✅ CASE 20: tax_id masking
    // =====================================================
    it("should mask tax_id correctly", () => {
        const data = {
            body: {
                taxId: "1234567890123"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "tax_id",
                maskingField: "body.taxId",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.taxId).toBe("123XXXXXXXX23");
    });

    // =====================================================
    // ✅ CASE 21: non-string value should not be masked
    // =====================================================
    it("should not mask non-string values", () => {
        const data = {
            body: {
                count: 12345
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "full",
                maskingField: "body.count",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.count).toBe(12345);
    });

    // =====================================================
    // ✅ CASE 22: null value should not be masked
    // =====================================================
    it("should not mask null values", () => {
        const data = {
            body: {
                email: null
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBeNull();
    });

    // =====================================================
    // ✅ CASE 23: root array with non-array data
    // =====================================================
    it("should not mask when using $ prefix on non-array data", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "$.body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        // Should not throw and should not change value
        expect(data.body.email).toBe("test@test.com");
    });

    // =====================================================
    // ✅ CASE 24: middle array with non-array data
    // =====================================================
    it("should not mask when using $.middle with non-array data", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.$.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        // Should not throw and should not change value
        expect(data.body.email).toBe("test@test.com");
    });

    // =====================================================
    // ✅ CASE 25: invalid path split for $. in middle
    // =====================================================
    it("should handle invalid $. path without fieldPath", () => {
        const data = {
            body: [
                { email: "test@test.com" }
            ]
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.$.",
                isArray: false
            }
        ];

        expect(() => service.mask(data, rules)).not.toThrow();
    });

    // =====================================================
    // ✅ CASE 26: custom config
    // =====================================================
    it("should use custom config", () => {
        const customConfig = {
            custom_type: [
                { condition_reg: "^test$", mask_pattern: "XXXX" }
            ]
        };

        const customService = new MaskingService(customConfig);
        const data = {
            body: {
                value: "test"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "custom_type",
                maskingField: "body.value",
                isArray: false
            }
        ];

        customService.mask(data, rules);

        expect(data.body.value).toBe("XXXX");
    });

    // =====================================================
    // ✅ CASE 27: isArray with non-array value
    // =====================================================
    it("should handle isArray=true with non-array value", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: true
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("tesxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 28: empty string value
    // =====================================================
    it("should not mask empty string", () => {
        const data = {
            body: {
                email: ""
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email",
                isArray: false
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("");
    });

    // =====================================================
    // ✅ CASE 29: pattern with character not found in value
    // =====================================================
    it("should handle pattern character not found in value", () => {
        const customConfig = {
            test_type: [
                { condition_reg: "^\\d{5}$", mask_pattern: "0-00XX" }
            ]
        };

        const customService = new MaskingService(customConfig);
        const data = {
            body: {
                value: "12345"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "test_type" as "none" | "custom_type",
                maskingField: "body.value",
                isArray: false
            }
        ];

        customService.mask(data, rules);

        expect(data.body.value).toBe("1-23XX");
    });

    // =====================================================
    // ✅ CASE 30: pattern with position character match
    // =====================================================
    it("should handle pattern with character match at position", () => {
        const customConfig = {
            test_type: [
                { condition_reg: "^hello@test\\.com$", mask_pattern: "000xx@XXX.XXX" }
            ]
        };

        const customService = new MaskingService(customConfig);
        const data = {
            body: {
                value: "hello@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "test_type" as "none" | "custom_type",
                maskingField: "body.value",
                isArray: false
            }
        ];

        customService.mask(data, rules);

        // Pattern processing: h-e-l-lo@XXX.XXX → "helxx@XXX.XXX"
        expect(data.body.value).toBe("helxx@XXX.XXX");
    });

    // =====================================================
    // ✅ CASE 31: rule without isArray (use default value)
    // =====================================================
    it("should handle rule without isArray property", () => {
        const data = {
            body: {
                email: "test@test.com"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.email"
            }
        ];

        service.mask(data, rules);

        expect(data.body.email).toBe("tesxx@xxx.xx.xx");
    });

    // =====================================================
    // ✅ CASE 32: undefined path in middle
    // =====================================================
    it("should handle undefined path in the middle of path", () => {
        const data = {
            body: {}
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "body.user.email",
                isArray: false
            }
        ];

        expect(() => service.mask(data, rules)).not.toThrow();
        expect((data.body as any)?.user).toBeUndefined();
    });

    // =====================================================
    // ✅ CASE 33: undefined nested object
    // =====================================================
    it("should handle deeply nested undefined path", () => {
        const data = {} as any;

        const rules: MaskingRule[] = [
            {
                maskingType: "email",
                maskingField: "a.b.c.d.email",
                isArray: false
            }
        ];

        expect(() => service.mask(data, rules)).not.toThrow();
    });

    // =====================================================
    // ✅ CASE 34: pattern with value shorter than pattern
    // =====================================================
    it("should handle value shorter than pattern", () => {
        const customConfig = {
            short_test: [
                { condition_reg: "^ab$", mask_pattern: "0000XXXX" }
            ]
        };

        const customService = new MaskingService(customConfig);
        const data = {
            body: {
                value: "ab"
            }
        };

        const rules: MaskingRule[] = [
            {
                maskingType: "short_test" as "none" | "custom_type",
                maskingField: "body.value",
                isArray: false
            }
        ];

        customService.mask(data, rules);

        // Value "ab" is shorter than pattern "0000XXXX"
        expect(data.body.value).toBe("abXXXX");
    });
});
