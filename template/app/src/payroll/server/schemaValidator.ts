/**
 * Zero-dependency Zod-compatible schema builder & validator
 * Cho phép validate các server operations độc lập trong môi trường Node.js mà không phụ thuộc node_modules
 */

import { HttpError } from './errors.ts';

export interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseError {
  success: false;
  error: {
    issues: { message: string; path?: (string | number)[] }[];
  };
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export interface BaseSchema<T = any> {
  safeParse(val: unknown): SafeParseResult<T>;
  parse(val: unknown): T;
  optional(): BaseSchema<T | undefined>;
  default(val: T): BaseSchema<T>;
}

export abstract class AbstractSchema<T = any> implements BaseSchema<T> {
  abstract safeParse(val: unknown): SafeParseResult<T>;
  abstract optional(): BaseSchema<T | undefined>;
  abstract default(val: T): BaseSchema<T>;

  parse(val: unknown): T {
    const res = this.safeParse(val);
    if (!res.success) {
      const msg = res.error.issues?.[0]?.message || 'Dữ liệu không hợp lệ';
      throw new HttpError(400, msg);
    }
    return res.data;
  }
}

class StringSchema extends AbstractSchema<string> {
  _minLength?: number;
  _maxLength?: number;
  _regex?: RegExp;
  _isOptional: boolean = false;
  _defaultValue?: string;

  min(length: number, message?: string) {
    this._minLength = length;
    return this;
  }

  max(length: number, message?: string) {
    this._maxLength = length;
    return this;
  }

  regex(pattern: RegExp, message?: string) {
    this._regex = pattern;
    return this;
  }

  optional(): BaseSchema<string | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: string): BaseSchema<string> {
    this._defaultValue = val;
    return this;
  }

  safeParse(val: unknown): SafeParseResult<string> {
    if (val === undefined || val === null) {
      if (this._defaultValue !== undefined) {
        return { success: true, data: this._defaultValue };
      }
      if (this._isOptional) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị bắt buộc không được để trống' }] } };
    }

    if (typeof val !== 'string') {
      return { success: false, error: { issues: [{ message: 'Giá trị phải là chuỗi (string)' }] } };
    }

    if (this._minLength !== undefined && val.length < this._minLength) {
      return { success: false, error: { issues: [{ message: `Độ dài tối thiểu là ${this._minLength} ký tự` }] } };
    }

    if (this._maxLength !== undefined && val.length > this._maxLength) {
      return { success: false, error: { issues: [{ message: `Độ dài tối đa là ${this._maxLength} ký tự` }] } };
    }

    if (this._regex !== undefined && !this._regex.test(val)) {
      return { success: false, error: { issues: [{ message: 'Định dạng chuỗi không hợp lệ' }] } };
    }

    return { success: true, data: val };
  }
}

class NumberSchema extends AbstractSchema<number> {
  _min?: number;
  _max?: number;
  _isInt: boolean = false;
  _isOptional: boolean = false;
  _defaultValue?: number;

  min(min: number, message?: string) {
    this._min = min;
    return this;
  }

  max(max: number, message?: string) {
    this._max = max;
    return this;
  }

  int(message?: string) {
    this._isInt = true;
    return this;
  }

  optional(): BaseSchema<number | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: number): BaseSchema<number> {
    this._defaultValue = val;
    return this;
  }

  safeParse(val: unknown): SafeParseResult<number> {
    if (val === undefined || val === null) {
      if (this._defaultValue !== undefined) {
        return { success: true, data: this._defaultValue };
      }
      if (this._isOptional) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị số bắt buộc không được để trống' }] } };
    }

    const num = Number(val);
    if (isNaN(num)) {
      return { success: false, error: { issues: [{ message: 'Giá trị phải là số (number)' }] } };
    }

    if (this._isInt && !Number.isInteger(num)) {
      return { success: false, error: { issues: [{ message: 'Giá trị phải là số nguyên' }] } };
    }

    if (this._min !== undefined && num < this._min) {
      return { success: false, error: { issues: [{ message: `Giá trị tối thiểu là ${this._min}` }] } };
    }

    if (this._max !== undefined && num > this._max) {
      return { success: false, error: { issues: [{ message: `Giá trị tối đa là ${this._max}` }] } };
    }

    return { success: true, data: num };
  }
}

class EnumSchema<T extends string> extends AbstractSchema<T> {
  allowedValues: T[];
  _isOptional: boolean = false;
  _defaultValue?: T;

  constructor(allowedValues: T[]) {
    super();
    this.allowedValues = allowedValues;
  }

  optional(): BaseSchema<T | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: T): BaseSchema<T> {
    this._defaultValue = val;
    return this;
  }

  safeParse(val: unknown): SafeParseResult<T> {
    if (val === undefined || val === null) {
      if (this._defaultValue !== undefined) {
        return { success: true, data: this._defaultValue };
      }
      if (this._isOptional) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị enum không được để trống' }] } };
    }

    if (!this.allowedValues.includes(val as T)) {
      return {
        success: false,
        error: { issues: [{ message: `Giá trị phải là một trong các giá trị: [${this.allowedValues.join(', ')}]` }] },
      };
    }

    return { success: true, data: val as T };
  }
}

class BooleanSchema extends AbstractSchema<boolean> {
  _isOptional: boolean = false;
  _defaultValue?: boolean;

  optional(): BaseSchema<boolean | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: boolean): BaseSchema<boolean> {
    this._defaultValue = val;
    return this;
  }

  safeParse(val: unknown): SafeParseResult<boolean> {
    if (val === undefined || val === null) {
      if (this._defaultValue !== undefined) {
        return { success: true, data: this._defaultValue };
      }
      if (this._isOptional) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị boolean không được để trống' }] } };
    }
    return { success: true, data: Boolean(val) };
  }
}

class ArraySchema<T> extends AbstractSchema<T[]> {
  itemSchema: BaseSchema<T>;
  _isOptional: boolean = false;

  constructor(itemSchema: BaseSchema<T>) {
    super();
    this.itemSchema = itemSchema;
  }

  optional(): BaseSchema<T[] | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: T[]): BaseSchema<T[]> {
    return this;
  }

  safeParse(val: unknown): SafeParseResult<T[]> {
    if (!Array.isArray(val)) {
      if (this._isOptional && (val === undefined || val === null)) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị phải là một mảng (array)' }] } };
    }

    const items: T[] = [];
    for (let i = 0; i < val.length; i++) {
      const res = this.itemSchema.safeParse(val[i]);
      if (!res.success) {
        return { success: false, error: { issues: [{ message: `Phần tử [${i}] không hợp lệ: ${res.error.issues[0].message}` }] } };
      }
      items.push(res.data);
    }

    return { success: true, data: items };
  }
}

class ObjectSchema<T extends Record<string, BaseSchema>> extends AbstractSchema<{ [K in keyof T]: any }> {
  shape: T;
  _isOptional: boolean = false;

  constructor(shape: T) {
    super();
    this.shape = shape;
  }

  optional(): BaseSchema<{ [K in keyof T]: any } | undefined> {
    this._isOptional = true;
    return this;
  }

  default(val: any): BaseSchema<any> {
    return this;
  }

  safeParse(val: unknown): SafeParseResult<{ [K in keyof T]: any }> {
    if (typeof val !== 'object' || val === null) {
      if (this._isOptional && (val === undefined || val === null)) {
        return { success: true, data: undefined as any };
      }
      return { success: false, error: { issues: [{ message: 'Giá trị phải là một đối tượng (object)' }] } };
    }

    const result: any = {};
    for (const key of Object.keys(this.shape)) {
      const schema = this.shape[key];
      const parsed = schema.safeParse((val as any)[key]);
      if (!parsed.success) {
        return {
          success: false,
          error: { issues: [{ message: `Trường [${key}] không hợp lệ: ${parsed.error.issues[0].message}` }] },
        };
      }
      result[key] = parsed.data;
    }

    return { success: true, data: result };
  }
}

export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(values: T[]) => new EnumSchema<T>(values),
  array: <T>(itemSchema: BaseSchema<T>) => new ArraySchema<T>(itemSchema),
  object: <T extends Record<string, BaseSchema>>(shape: T) => new ObjectSchema<T>(shape),
};
