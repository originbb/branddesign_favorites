export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

export type Bookmark = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  categoryId: number | null;
  sortOrder: number;
  createdAt: string;
};

export type PersonalBookmark = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  categoryId: number | null;
  createdAt: string;
};

export type Profile = {
  id: number;
  name: string;
  orderKeys: string[];
};
