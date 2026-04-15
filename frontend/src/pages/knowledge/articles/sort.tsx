import { ArticleSortList } from "./components/ArticleSortList";
import { Permission } from "@/components/permission/Permission";

export default function ArticleSortPage() {
  return (
    <Permission code="knowledge:article:sort">
      <ArticleSortList />
    </Permission>
  );
}
