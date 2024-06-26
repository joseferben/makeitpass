export async function spinner<T>(message: string, promise: Promise<T>): Promise<T> {
  const ora = await import("ora");
  const spinner = ora.default(message);
  spinner.start();
  const result = await promise;
  spinner.stop();
  return result;
}
