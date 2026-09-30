// پکیج @workspace/graphql
// تمام کوئری‌ها، میوتیشن‌ها و تایپ‌های تولیدشده‌ی GraphQL فقط از این پکیج استفاده می‌شن.
// مستندات .graphql در src/ هستند و خروجی codegen در src/gql/ (ایگنور شده در git).
export * from "./gql"
// Documentهای تایپ‌سیف و تایپ‌های هر عملیات از فایل اصلی codegen:
export * from "./gql/graphql"
// تایپ‌های کمکی TypedDocumentNode (مثل ResultOf و VariablesOf):
export type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core"
