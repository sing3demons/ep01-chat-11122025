interface SqlResult {
    sql: string;
    params: any[];
}
type Scalar = string | number | boolean | Date;

type ScalarFilter<T extends Scalar> = {
    equals?: T;
    in?: T[];
    gt?: T;
    gte?: T;
    lt?: T;
    lte?: T;
};

export type WhereInput<T> = {
    AND?: WhereInput<T>[];
    OR?: WhereInput<T>[];
    NOT?: WhereInput<T>[];
} & {
    [K in keyof T]?: T[K] extends Scalar
    ? T[K] | ScalarFilter<T[K]>
    : never;
};

export type OrderBy<T> = {
    [K in keyof T]?: 'asc' | 'desc';
};

export interface FindArgs<T> {
    where?: WhereInput<T>;
    orderBy?: OrderBy<T>;
    take?: number;
    skip?: number;
}


export class SqlBuilder {
    constructor(private table: string) { }

    select(
        where?: WhereInput<any>,
        orderBy?: OrderBy<any>,
        take?: number,
        skip?: number
    ): SqlResult {
        const conditions: string[] = [];
        const params: any[] = [];

        if (where) {
            this.parseWhere(where, conditions, params);
        }

        const whereSql =
            conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

        const orderSql = orderBy
            ? ' ORDER BY ' +
            Object.entries(orderBy)
                .map(([k, v]) => `${k} ${v!.toUpperCase()}`)
                .join(', ')
            : '';

        const limitSql =
            take !== undefined ? ` LIMIT ${take}` : '';

        const offsetSql =
            skip !== undefined ? ` OFFSET ${skip}` : '';

        return {
            sql:
                `SELECT * FROM ${this.table}` +
                whereSql +
                orderSql +
                limitSql +
                offsetSql,
            params,
        };
    }

    insert(data: Record<string, any>): SqlResult {
        const keys = Object.keys(data);
        const values = Object.values(data);

        return {
            sql: `INSERT INTO ${this.table} (${keys.join(
                ', '
            )}) VALUES (${keys.map(() => '?').join(', ')})`,
            params: values,
        };
    }

    update(
        data: Record<string, any>,
        where?: WhereInput<any>
    ): SqlResult {
        const sets: string[] = [];
        const params: any[] = [];

        for (const [k, v] of Object.entries(data)) {
            sets.push(`${k} = ?`);
            params.push(v);
        }

        const conditions: string[] = [];
        if (where) {
            this.parseWhere(where, conditions, params);
        }

        const whereSql =
            conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

        return {
            sql: `UPDATE ${this.table} SET ${sets.join(', ')}` + whereSql,
            params,
        };
    }

    delete(where?: WhereInput<any>): SqlResult {
        const conditions: string[] = [];
        const params: any[] = [];

        if (where) {
            this.parseWhere(where, conditions, params);
        }

        const whereSql =
            conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

        return {
            sql: `DELETE FROM ${this.table}` + whereSql,
            params,
        };
    }

    /* ======================
       WHERE PARSER (Prisma-style)
       ====================== */

    private parseWhere(
        where: WhereInput<any>,
        conditions: string[],
        params: any[]
    ) {
        for (const [key, value] of Object.entries(where)) {
            if (key === 'OR' && Array.isArray(value)) {
                const or: string[] = [];

                for (const sub of value) {
                    const subConds: string[] = [];
                    this.parseWhere(sub, subConds, params);
                    if (subConds.length) {
                        or.push(`(${subConds.join(' AND ')})`);
                    }
                }

                if (or.length) {
                    conditions.push(`(${or.join(' OR ')})`);
                }
                continue;
            }

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                for (const [op, v] of Object.entries(value)) {
                    if (op === 'equals') {
                        conditions.push(`${key} = ?`);
                        params.push(v);
                    }
                    if (op === 'gt') {
                        conditions.push(`${key} > ?`);
                        params.push(v);
                    }
                    if (op === 'in' && Array.isArray(v)) {
                        conditions.push(
                            `${key} IN (${v.map(() => '?').join(', ')})`
                        );
                        params.push(...v);
                    }
                }
                continue;
            }

            conditions.push(`${key} = ?`);
            params.push(value);
        }
    }
}
interface CreateManyArgs<T> {
    data: T[];
}


export class PrismaModelClient<T extends Record<string, any>> {
    private qb: SqlBuilder;
    private table: string;

    constructor(table: string) {
        this.qb = new SqlBuilder(table);
        this.table = table;
    }

    createMany(data: Record<string, any>[]): SqlResult {
        if (!data.length) {
            throw new Error('createMany requires at least one row');
        }

        const keys = Object.keys(data[0]);
        const params: any[] = [];

        const valuesSql = data
            .map(row => {
                keys.forEach(k => params.push(row[k]));
                return `(${keys.map(() => '?').join(', ')})`;
            })
            .join(', ');

        return {
            sql: `INSERT INTO ${this.table} (${keys.join(
                ', '
            )}) VALUES ${valuesSql}`,
            params,
        };
    }


    findFirst(args: FindArgs<T>) {
        return this.qb.select(
            args.where,
            args.orderBy,
            1,
            args.skip
        );
    }

    findMany(args: FindArgs<T> = {}) {
        return this.qb.select(
            args.where,
            args.orderBy,
            args.take,
            args.skip
        );
    }

    create(args: { data: T }) {
        return this.qb.insert(args.data);
    }

    update(args: { data: Partial<T>; where: WhereInput<T> }) {
        return this.qb.update(args.data, args.where);
    }

    delete(args: { where: WhereInput<T> }) {
        return this.qb.delete(args.where);
    }
}
