// خواندن env مربوط به مسیر پروکسی — جدا نگه‌داشتن برای پرهیز از import چرخشی
export const GRAPHQL_PROXY_PATH = process.env.GRAPHQL_PROXY_PATH ?? "/api/graphql"
