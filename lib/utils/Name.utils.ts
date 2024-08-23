export namespace NameUtils {
  export function toCamelCase(str: string): string {
    return str.replace(/-./g, (m) => m.toUpperCase()[1]);
  }

  export function toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
