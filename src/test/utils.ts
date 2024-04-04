export function parametrize(
    values: any[],
    descFn: (v: any) => string,
    body: (v: any) => void,
) {
    for (const val of values) {
        test(descFn(val), () => {
            body(val);
        });
    }
}
