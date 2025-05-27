export type MultipleQueryObject = {
    query: string;
    valuesArray: any[];
}[];

// String combinations
export type StringOrNull = string | null;
export type StringOrUndefined = string | undefined;
export type StringOrNullOrUndefined = string | null | undefined;

// Number combinations
export type NumberOrNull = number | null;
export type NumberOrUndefined = number | undefined;
export type NumberOrNullOrUndefined = number | null | undefined;

// Boolean combinations
export type BooleanOrNull = boolean | null;
export type BooleanOrUndefined = boolean | undefined;
export type BooleanOrNullOrUndefined = boolean | null | undefined;

// Date combinations
export type DateOrNull = Date | null;
export type DateOrUndefined = Date | undefined;
export type DateOrNullOrUndefined = Date | null | undefined;

// Object combinations (generic)
export type ObjOrNull<T> = T | null;
export type ObjOrUndefined<T> = T | undefined;
export type ObjOrNullOrUndefined<T> = T | null | undefined;

// Array combinations (generic)
export type ArrayOrNull<T> = T[] | null;
export type ArrayOrUndefined<T> = T[] | undefined;
export type ArrayOrNullOrUndefined<T> = T[] | null | undefined;
