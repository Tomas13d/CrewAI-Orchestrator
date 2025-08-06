type FormatMap = { [key: string]: string | number | undefined };

export default function formatTemplate<T extends FormatMap>(
  template: string,
  values: T
): string {
  return template.replace(/{(\w+)}/g, (_, key) => {
    return key in values ? String(values[key as keyof T]) : `{${key}}`;
  });
}