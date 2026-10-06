export const STORY_IDS = ['priya', 'marcus', 'aisha', 'diego', 'elena', 'james', 'sarah', 'david', 'chen'] as const;

export type StoryId = (typeof STORY_IDS)[number];

export const isStoryId = (value: string): value is StoryId => (STORY_IDS as readonly string[]).includes(value);
