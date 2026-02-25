import configuration from "../../content-collections.ts";
import { GetTypeByName } from "@content-collections/core";

export type PomodorocatBlog = GetTypeByName<typeof configuration, "pomodorocatBlog">;
export declare const allPomodorocatBlogs: Array<PomodorocatBlog>;

export {};
