/**
 * Turbopack loader that removes `//# sourceMappingURL=` comments.
 *
 * Used for r3f-perf's bundled font module, whose source map points at a
 * binary .woff file; Turbopack panics trying to read it as UTF-8.
 */
module.exports = function stripSourceMapUrl(source) {
  return source.replace(/^\/\/# sourceMappingURL=.*$/gm, "");
};
