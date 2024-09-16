import {notice} from "./cli-color.ts";

export function logger(...message: any[]) {
  console.log(`${notice('[lms_tool]:')} - `, ...message);
}