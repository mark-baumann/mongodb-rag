import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const script = spawn(command, ['run', 'import-courses']);

      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}

`);
      };

      script.stdout.on('data', (data) => {
        const text = data.toString();
        send({ message: text });
      });

      script.stderr.on('data', (data) => {
        const text = data.toString();
        send({ error: text });
      });

      script.on('close', (code) => {
        send({ message: `Script finished with code ${code}` });
        controller.close();
      });

      script.on('error', (err) => {
        send({ error: `Failed to start script: ${err.message}` });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
