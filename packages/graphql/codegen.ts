import type { CodegenConfig } from "@graphql-codegen/cli"

// منبع اسکیما: فایل SDL لوکال (با scripts/fetch-schema.mjs به‌روز می‌شه)
// مزیت: codegen قطعی و بدون وابستگی به شبکه اجرا می‌شه
const config: CodegenConfig = {
  schema: "./schema.json.graphql",
  documents: ["src/**/*.graphql"],

  generates: {
    "./src/gql/": {
      preset: "client",
      // خروجی: تایپ‌ها + TypedDocumentNode تایپ‌سیف برای هر document.
      // urql به صورت native از TypedDocumentNode پشتیبانی می‌کند؛
      // یعنی useQuery({ query: ProductsListDocument }) کاملاً تایپ‌سیف است.
      config: {
        scalars: {
          DateTime: { input: "string", output: "string" },
          Date: { input: "string", output: "string" },
          Time: { input: "string", output: "string" },
          JSON: { input: "unknown", output: "unknown" },
        },
      },
    },
  },
}

export default config
