import { spawn } from "node:child_process";

export function execCli(
  command: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`failed to execute ${command}: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0 && stderr) {
        console.error(`[cli] ${command} stderr: ${stderr}`);
      }
      resolve({ stdout, exitCode: code ?? 1 });
    });
  });
}

export async function isCliAvailable(command: string): Promise<boolean> {
  try {
    const { exitCode } = await execCli("which", [command], 5_000);
    return exitCode === 0;
  } catch {
    return false;
  }
}
