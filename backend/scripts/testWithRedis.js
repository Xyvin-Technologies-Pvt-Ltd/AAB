/**
 * Test runner wrapper: starts a throwaway local redis-server for the
 * duration of `npm test`, points REDIS_URL at it, runs the Node test suite,
 * then always tears the Redis process down - so `npm test` needs nothing
 * pre-installed/running beyond `redis-server` itself being on PATH.
 */
import { spawn } from 'child_process';
import net from 'net';

const REDIS_PORT = 6399;
const REDIS_URL = `redis://127.0.0.1:${REDIS_PORT}`;

const waitForPort = (port, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(attempt, 100);
        }
      });
    };
    attempt();
  });

const run = async () => {
  const redis = spawn('redis-server', ['--port', String(REDIS_PORT), '--save', '', '--appendonly', 'no'], {
    stdio: 'ignore',
  });

  redis.on('error', (error) => {
    console.error(
      `Could not start redis-server (is it installed and on PATH?): ${error.message}`
    );
    process.exit(1);
  });

  try {
    await waitForPort(REDIS_PORT);

    const exitCode = await new Promise((resolve) => {
      // No path argument - Node's test runner auto-discovers ./tests/**/*.test.js.
      // Passing "tests/" explicitly makes it try to require() that path instead.
      const child = spawn('node', ['--test'], {
        stdio: 'inherit',
        env: { ...process.env, REDIS_URL },
      });
      child.on('exit', (code) => resolve(code ?? 1));
    });

    process.exitCode = exitCode;
  } finally {
    redis.kill();
  }
};

run();
