// تحلیل اسکیمای GraphQL از روی خروجی introspection
// خروجی: لیست Query/Mutation با آرگومان‌ها + دسته‌بندی تایپ‌ها (مدل‌ها، اینپوت‌ها، فیلترها...)
import fs from "node:fs"

const doc = JSON.parse(fs.readFileSync(new URL("./schema.json", import.meta.url), "utf8"))
const schema = doc.data.__schema
const typeMap = new Map(schema.types.map((t) => [t.name, t]))

const BUILTIN = new Set([
  "__Schema", "__Type", "__TypeKind", "__Field", "__InputValue",
  "__EnumValue", "__Directive", "__DirectiveLocation",
  "String", "Boolean", "Int", "Float", "ID",
])

// نمایش خوانای تایپ (مثل [ProductFilterInput!]!)
const typeRef = (t) => {
  if (!t) return "?"
  if (t.kind === "NON_NULL") return `${typeRef(t.ofType)}!`
  if (t.kind === "LIST") return `[${typeRef(t.ofType)}]`
  return t.name
}

const shortArgs = (args) =>
  args.length === 0 ? "" : `(${args.map((a) => `${a.name}: ${typeRef(a.type)}`).join(", ")})`

const fmtField = (f) => `  ${f.name}${shortArgs(f.args)}: ${typeRef(f.type)}`

const section = (title, lines) => {
  console.log(`\n${"=".repeat(70)}\n${title} (${lines.length})\n${"=".repeat(70)}`)
  for (const l of lines) console.log(l)
}

const queryType = typeMap.get(schema.queryType.name)
const mutationType = schema.mutationType ? typeMap.get(schema.mutationType.name) : null

section("QUERY fields", queryType.fields.map(fmtField))
if (mutationType) section("MUTATION fields", mutationType.fields.map(fmtField))

// دسته‌بندی بقیه‌ی تایپ‌ها
const groups = {
  OBJECT: [],
  INPUT_OBJECT: [],
  ENUM: [],
  INTERFACE: [],
  UNION: [],
  SCALAR: [],
}
for (const t of schema.types) {
  if (BUILTIN.has(t.name) || t.name.startsWith("__")) continue
  if (t === queryType || t === mutationType) continue
  ;(groups[t.kind] ??= []).push(t)
}

section("OBJECT types", groups.OBJECT.map((t) => {
  const fields = t.fields.map((f) => `${f.name}: ${typeRef(f.type)}`)
  return `${t.name}\n    ${fields.join("\n    ")}`
}))
section("INPUT_OBJECT types", groups.INPUT_OBJECT.map((t) => {
  const fields = t.inputFields.map((f) => `${f.name}: ${typeRef(f.type)}`)
  return `${t.name}\n    ${fields.join("\n    ")}`
}))
section("ENUM types", groups.ENUM.map((t) => `${t.name} = [${t.enumValues.map((v) => v.name).join(" | ")}]`))
section("INTERFACE types", groups.INTERFACE.map((t) => {
  const fields = t.fields.map((f) => `${f.name}: ${typeRef(f.type)}`)
  return `${t.name}\n    ${fields.join("\n    ")}`
}))
section("UNION types", groups.UNION.map((t) => `${t.name} = [${t.possibleTypes.map((p) => p.name).join(" | ")}]`))
section("custom SCALARS", groups.SCALAR.map((t) => t.name))
