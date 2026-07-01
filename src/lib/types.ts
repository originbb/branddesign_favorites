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
  personalCategoryId: number | null;
  createdAt: string;
};

export type Profile = {
  id: number;
  name: string;
  orderKeys: string[];
  /** 관리자 목록에서만 채워짐: 이 프로필이 가진 개인 북마크 수 */
  bookmarkCount?: number;
};
