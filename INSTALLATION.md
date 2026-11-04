# Image resolution and tool history repair

This branch starts at upstream v0.9.4, matching the installed runtime. The source
fix preserves each message envelope while replacing its resolved content. This
retains message-level toolCallId, isError and id even when an image exists elsewhere
in history. No placeholder-generation or output-rejection policy is added.

The tests cover both user images and tool-result images alongside parallel tool
history, and assert input immutability. Build dependencies pin Schemastery and
resolve its types from this checkout to prevent an unrelated ancestor node_modules
installation from merging incompatible global schema declarations.

Run `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm build`.

The existing Desktop installation has separate compatibility repairs (new tool
message schema, tool-role conversion, call-ID normalization, and a renamed image
tool). Replacing its entire bundle with stock v0.9.4 would erase those repairs.
The maintained installer therefore transplants the fork's compiled resolveImages
function into both installed entry points. It refuses other versions and any
algorithm differences beyond this exact envelope fix, preserves all other bytes,
and saves originals and a Git-revision/hash receipt before writing.

    node scripts/install-image-history-fix.mjs PACKAGE_DIRECTORY
    node scripts/install-image-history-fix.mjs PACKAGE_DIRECTORY --install
    node scripts/verify-installed-history.mjs PACKAGE_DIRECTORY

Restart the harness when idle, then inspect a real request after image resolution
and at the Claude request body. Verify actual tool_use/tool_result counts match the
native history and all matching IDs remain paired. Unit tests alone are insufficient:
the original bug only appeared in the full image-resolution/request pipeline.

The private session/capture never belongs in this fork. An adapter upgrade can
replace this local overlay; rerun verification before claiming it remains active.
