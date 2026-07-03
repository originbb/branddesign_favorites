export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

/** 개인 모드 통합 카테고리 항목. kind='s'는 팀 공유, kind='p'는 개인 카테고리. */
export type UnifiedEntry = { kind: 's' | 'p'; cat: Category };

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
