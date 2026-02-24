import { GetTypeByName } from '@content-collections/core';
import configuration from '../../content-collections.ts';

export type PomodorocatBlog = GetTypeByName<typeof configuration, 'pomodorocatBlog'>;
export declare const allPomodorocatBlogs: Array<PomodorocatBlog>;

export {};
