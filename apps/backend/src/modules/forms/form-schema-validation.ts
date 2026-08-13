/**
 * Structural validation for the JSON Schema documents that drive the dynamic
 * submission form. This module is deliberately pure — no Nest, no TypeORM — so
 * the rules can be unit tested and reused from a dry-run endpoint.
 *
 * The rules encode what `apps/frontend/src/components/dynamic-form.tsx` can
 * actually render. A schema that passes here is guaranteed to produce a usable
 * form; anything the renderer would silently drop or crash on is reported.
 */

/** A single thing wrong with a schema, addressed by a JSON path. */
export interface FormSchemaProblem {
  /** Dotted path into the submitted document, e.g. `schema.properties.yearBuilt.type`. */
  path: string;
  /** Human readable explanation, safe to show to an administrator. */
  message: string;
}

/** Field types the renderer knows how to draw. */
export const SUPPORTED_FIELD_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const;

/** Types that are meaningful as the `items` of an array. */
export const SUPPORTED_ARRAY_ITEM_TYPES = ['string', 'number', 'integer', 'boolean', 'object'] as const;

/** Keys on a field definition that may carry conditional-display logic. */
const FIELD_CONDITION_KEYS = ['dependsOn', 'showWhen', 'visibleWhen', 'visibleIf'];

/** Keys on a uiSchema entry that may carry conditional-display logic. */
const UI_CONDITION_KEYS = ['ui:showIf', 'ui:dependsOn'];

/** The renderer only descends one level into nested objects. */
const MAX_NESTING_DEPTH = 1;

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const quote = (value: unknown) => (typeof value === 'string' ? `"${value}"` : JSON.stringify(value));

interface NormalisedCondition {
  /** Name of the field the condition points at, or null when unreadable. */
  field: string | null;
  /** Values the condition compares against; empty when it does not compare. */
  values: unknown[];
}

/**
 * Accepts the shorthand `"fieldName"` as well as the object forms
 * `{ field, equals }`, `{ field, in: [...] }` and `{ field, notEquals }`.
 * Returns undefined when the value is not a condition at all.
 */
function normaliseCondition(raw: unknown): NormalisedCondition | undefined {
  if (typeof raw === 'string') {
    return { field: raw.trim() ? raw : null, values: [] };
  }

  if (!isPlainObject(raw)) return undefined;

  const field = typeof raw.field === 'string' && raw.field.trim() ? raw.field : null;
  const values: unknown[] = [];
  if ('equals' in raw) values.push(raw.equals);
  if ('notEquals' in raw) values.push(raw.notEquals);
  if (Array.isArray(raw.in)) values.push(...raw.in);

  return { field, values };
}

/** Every field name in the document, mapped to the paths that declared it. */
type FieldIndex = Map<string, { paths: string[]; definitions: Record<string, any>[] }>;

function indexField(index: FieldIndex, name: string, path: string, definition: unknown) {
  const entry = index.get(name) ?? { paths: [], definitions: [] };
  entry.paths.push(path);
  if (isPlainObject(definition)) entry.definitions.push(definition);
  index.set(name, entry);
}

/**
 * Validates a form schema (and its optional uiSchema) against everything the
 * dynamic renderer needs. Returns *all* problems found — callers are expected
 * to show the complete list rather than the first failure.
 */
export function validateFormSchemaDefinition(
  schema: unknown,
  uiSchema?: unknown,
): FormSchemaProblem[] {
  const problems: FormSchemaProblem[] = [];
  const add = (path: string, message: string) => problems.push({ path, message });

  if (!isPlainObject(schema)) {
    add('schema', 'Schema must be a JSON object.');
    return problems;
  }

  if (schema.type !== 'object') {
    add(
      'schema.type',
      `Top-level "type" must be "object" (received ${quote(schema.type ?? undefined)}).`,
    );
  }

  if (!isPlainObject(schema.properties)) {
    add('schema.properties', 'Schema must declare a "properties" object holding its fields.');
    return problems;
  }

  const properties = schema.properties;
  const topLevelKeys = Object.keys(properties);
  if (topLevelKeys.length === 0) {
    add('schema.properties', 'Schema declares no fields — an empty form cannot be published.');
  }

  const index: FieldIndex = new Map();

  const checkEnum = (path: string, holder: Record<string, any>) => {
    if (!('enum' in holder)) return;
    const options = holder.enum;

    if (!Array.isArray(options)) {
      add(`${path}.enum`, '"enum" must be an array of options.');
      return;
    }
    if (options.length === 0) {
      add(`${path}.enum`, '"enum" must list at least one option.');
      return;
    }

    const seen = new Set<string>();
    options.forEach((option, position) => {
      if (typeof option !== 'string') {
        add(
          `${path}.enum[${position}]`,
          `Option ${quote(option)} must be a string — the renderer prints enum values directly.`,
        );
        return;
      }
      if (seen.has(option)) {
        add(`${path}.enum[${position}]`, `Duplicate option ${quote(option)}.`);
      }
      seen.add(option);
    });
  };

  const checkRequiredList = (path: string, holder: Record<string, any>, known: string[]) => {
    if (!('required' in holder)) return;
    const required = holder.required;

    if (!Array.isArray(required)) {
      add(`${path}.required`, '"required" must be an array of field names.');
      return;
    }

    const seen = new Set<string>();
    required.forEach((name, position) => {
      if (typeof name !== 'string') {
        add(`${path}.required[${position}]`, `Required entry ${quote(name)} must be a field name.`);
        return;
      }
      if (seen.has(name)) {
        add(`${path}.required[${position}]`, `Field ${quote(name)} is listed as required twice.`);
      }
      seen.add(name);
      if (!known.includes(name)) {
        add(
          `${path}.required[${position}]`,
          `Required field ${quote(name)} is not declared in "properties".`,
        );
      }
    });
  };

  const checkField = (path: string, name: string, definition: unknown, depth: number) => {
    indexField(index, name, path, definition);

    if (!isPlainObject(definition)) {
      add(path, `Field ${quote(name)} must be defined as a JSON object.`);
      return;
    }

    const type = definition.type;
    if (typeof type !== 'string' || !type) {
      add(`${path}.type`, `Field ${quote(name)} must declare a "type".`);
    } else if (!(SUPPORTED_FIELD_TYPES as readonly string[]).includes(type)) {
      add(
        `${path}.type`,
        `Field ${quote(name)} uses unsupported type ${quote(type)}. Supported types: ${SUPPORTED_FIELD_TYPES.join(', ')}.`,
      );
    }

    checkEnum(path, definition);

    if (type === 'object') {
      if (!isPlainObject(definition.properties) || Object.keys(definition.properties).length === 0) {
        add(
          `${path}.properties`,
          `Section ${quote(name)} has no fields — empty sections render as a blank box.`,
        );
      } else if (depth >= MAX_NESTING_DEPTH) {
        add(
          `${path}.properties`,
          `Section ${quote(name)} nests deeper than one level, which the form renderer does not support.`,
        );
      } else {
        const nestedKeys = Object.keys(definition.properties);
        checkRequiredList(path, definition, nestedKeys);
        for (const nestedKey of nestedKeys) {
          checkField(
            `${path}.properties.${nestedKey}`,
            nestedKey,
            definition.properties[nestedKey],
            depth + 1,
          );
        }
      }
      return;
    }

    if (type === 'array') {
      const items = definition.items;
      if (!isPlainObject(items)) {
        add(`${path}.items`, `List ${quote(name)} must declare an "items" definition.`);
        return;
      }

      const itemType = items.type;
      if (typeof itemType !== 'string' || !itemType) {
        add(`${path}.items.type`, `List ${quote(name)} must declare "items.type".`);
      } else if (!(SUPPORTED_ARRAY_ITEM_TYPES as readonly string[]).includes(itemType)) {
        add(
          `${path}.items.type`,
          `List ${quote(name)} uses unsupported item type ${quote(itemType)}. Supported item types: ${SUPPORTED_ARRAY_ITEM_TYPES.join(', ')}.`,
        );
      }

      checkEnum(`${path}.items`, items);

      // Repeating groups are captured as raw JSON by the renderer, so their
      // inner names never become form controls — only the shell is checked.
      if (itemType === 'object') {
        if (!isPlainObject(items.properties) || Object.keys(items.properties).length === 0) {
          add(
            `${path}.items.properties`,
            `Repeating group ${quote(name)} has no fields — empty sections cannot be filled in.`,
          );
        }
      }
    }
  };

  checkRequiredList('schema', schema, topLevelKeys);
  for (const key of topLevelKeys) {
    checkField(`schema.properties.${key}`, key, properties[key], 0);
  }

  // Duplicate names collide on the DOM ids and labels the renderer emits, so a
  // name reused anywhere in the tree makes one of the two fields unusable.
  for (const [name, entry] of index) {
    if (entry.paths.length <= 1) continue;
    const [first, ...rest] = entry.paths;
    for (const duplicate of rest) {
      add(duplicate, `Duplicate field name ${quote(name)} — already declared at ${first}.`);
    }
  }

  // ---- conditional logic -------------------------------------------------

  const resolveTarget = (field: string) => index.get(field);

  const checkCondition = (path: string, key: string, raw: unknown) => {
    const condition = normaliseCondition(raw);
    if (!condition) {
      add(`${path}.${key}`, `Conditional logic in "${key}" must be a field name or an object with a "field".`);
      return;
    }
    if (!condition.field) {
      add(`${path}.${key}`, `Conditional logic in "${key}" does not name a field.`);
      return;
    }

    const target = resolveTarget(condition.field);
    if (!target) {
      add(
        `${path}.${key}`,
        `Conditional logic references unknown field ${quote(condition.field)}.`,
      );
      return;
    }

    const withEnum = target.definitions.find((def) => Array.isArray(def.enum));
    if (!withEnum) return;
    for (const value of condition.values) {
      if (typeof value === 'string' && !withEnum.enum.includes(value)) {
        add(
          `${path}.${key}`,
          `Conditional logic compares ${quote(condition.field)} against ${quote(value)}, which is not one of its options.`,
        );
      }
    }
  };

  const walkConditions = (path: string, definition: unknown) => {
    if (!isPlainObject(definition)) return;
    for (const key of FIELD_CONDITION_KEYS) {
      if (key in definition) checkCondition(path, key, definition[key]);
    }
    if (definition.type === 'object' && isPlainObject(definition.properties)) {
      for (const nestedKey of Object.keys(definition.properties)) {
        walkConditions(`${path}.properties.${nestedKey}`, definition.properties[nestedKey]);
      }
    }
  };

  for (const key of topLevelKeys) {
    walkConditions(`schema.properties.${key}`, properties[key]);
  }

  // ---- uiSchema ----------------------------------------------------------

  if (uiSchema !== undefined && uiSchema !== null) {
    if (!isPlainObject(uiSchema)) {
      add('uiSchema', 'uiSchema must be a JSON object when provided.');
    } else {
      const order = uiSchema['ui:order'];
      if (order !== undefined) {
        if (!Array.isArray(order)) {
          add('uiSchema.ui:order', '"ui:order" must be an array of field names.');
        } else {
          const seen = new Set<string>();
          order.forEach((name, position) => {
            if (typeof name !== 'string') {
              add(`uiSchema.ui:order[${position}]`, `Entry ${quote(name)} must be a field name.`);
              return;
            }
            if (seen.has(name)) {
              add(`uiSchema.ui:order[${position}]`, `Field ${quote(name)} is ordered twice.`);
            }
            seen.add(name);
            if (!topLevelKeys.includes(name)) {
              add(
                `uiSchema.ui:order[${position}]`,
                `"ui:order" references unknown field ${quote(name)}.`,
              );
            }
          });

          // The renderer draws *only* what ui:order lists, so an omission
          // silently hides the field.
          for (const key of topLevelKeys) {
            if (!seen.has(key)) {
              add(
                'uiSchema.ui:order',
                `"ui:order" omits field ${quote(key)}, which would stop it rendering.`,
              );
            }
          }
        }
      }

      for (const [entryKey, entry] of Object.entries(uiSchema)) {
        if (entryKey === 'ui:order' || !isPlainObject(entry)) continue;
        for (const key of UI_CONDITION_KEYS) {
          if (key in entry) checkCondition(`uiSchema.${entryKey}`, key, entry[key]);
        }
      }
    }
  }

  return problems;
}

/** True when the document is renderable as-is. */
export const isValidFormSchemaDefinition = (schema: unknown, uiSchema?: unknown): boolean =>
  validateFormSchemaDefinition(schema, uiSchema).length === 0;

/**
 * Produces the next free version string for a schema family. Bumps the last
 * numeric segment of `current` and keeps bumping while the result is taken, so
 * a family that already holds 1.0.1 moves 1.0.0 straight to 1.0.2.
 */
export function nextVersion(current: string, taken: string[] = []): string {
  const used = new Set(taken);
  const match = /^(.*?)(\d+)(\D*)$/.exec(current ?? '');

  if (!match) {
    let counter = 2;
    let candidate = `${current || '1.0.0'}-v${counter}`;
    while (used.has(candidate)) candidate = `${current || '1.0.0'}-v${++counter}`;
    return candidate;
  }

  const [, prefix, digits, suffix] = match;
  let value = parseInt(digits, 10);
  let candidate = `${prefix}${value + 1}${suffix}`;
  while (used.has(candidate)) {
    value += 1;
    candidate = `${prefix}${value + 1}${suffix}`;
  }
  return candidate;
}
