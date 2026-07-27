/** 仅在首次插入时写入关联表；冲突更新时保留 SQL 内已有 viewing_paths / media_assets。 */
export function shouldReplaceMovieRelations(isExistingMovie: boolean) {
  return !isExistingMovie;
}
