
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const { stdout, stderr } = await execPromise('npm run import-courses');
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return NextResponse.json({ success: false, message: stderr }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: stdout });
  } catch (error) {
    console.error(`error: ${error.message}`);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
