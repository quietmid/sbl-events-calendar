## CLI Commands

All CLI instructions can be found at:
node_modules/@wix/cli/agents/instructions.md

## Skills

This project comes with a set of skills that can be used when the user asks for help with specific tasks.
If you're using the instructions provided by a skill and fail, or if you do not find a relevant skill for the task,
you can try updating the skills by running the following command:

`wix skills update`

This will update the skills to the latest version.

## Skill: Clean Coding

Apply this skill whenever you write, edit, or review code in this repository.

### When to use
- Adding a feature, fixing a bug, or refactoring.
- Reviewing code before finishing a task.

### Workflow
1. **Read first.** Look at the surrounding files and match their patterns, naming, and structure.
2. **Search before writing.** Check for existing helpers before creating new ones.
3. **Make the smallest change that solves the task.** Do not refactor, rename, or reformat unrelated code.
4. **Apply the rules below** to everything you write.
5. **Verify.** Run the checks in "Definition of done" and fix every failure.

### Rules

**Structure**
- One function does one thing. Aim for under 40 lines.
- Maximum 3 levels of nesting. Use early returns and guard clauses.
- Maximum 4 parameters. Group more into an object.
- Keep files focused on one responsibility.

**Naming**
- Names describe intent: `getActiveUsers`, not `getData`.
- Booleans read as questions: `isActive`, `hasAccess`.
- No single-letter names except short loop indexes.
- Follow the casing convention of the language and project.

**Duplication and constants**
- Do not copy logic. Extract it once you see it a second time.
- No magic numbers or strings. Use named constants.

**Comments**
- Explain why, not what. If a comment explains what, rename or simplify the code.
- Delete commented-out code and stale TODOs you created.

**Error handling**
- Never swallow errors silently.
- Use the project's standard error types and logging.
- Validate input at boundaries (API handlers, CLI args, file reads).

**Types and safety**
- Add types or annotations to all public functions.
- Avoid `any` or equivalent escape hatches unless unavoidable. If used, add a comment saying why.

**Tests**
- Add or update tests for any behavior you change.
- Test names describe the expected behavior.
- Do not delete or weaken existing tests to make them pass.

### Examples

Bad:
```js
if (user) {
  if (user.active) {
    if (user.role === 'admin') {
      doThing(user);
    }
  }
}
```

Good:
```js
if (!user?.active || user.role !== 'admin') return;
doThing(user);
```

### Definition of done
Before reporting the task as complete, verify:
1. The lint command, if configured, has no errors or new warnings.
2. The format command, if configured, has been run.
3. `npm run typecheck` passes.
4. `node --test --experimental-test-module-mocks tests/*.test.mjs` passes.
5. The diff contains only changes related to the task.

Lint and format commands are not currently configured. Report these checks as unavailable
unless the project adds them; do not claim they passed.

### Final self-review
Before finishing, check the diff and ask:
- Could any function be shorter or simpler?
- Did I duplicate something that already exists?
- Are all names clear without needing a comment?
- Did I leave debug logs, dead code, or unused imports?

If the answer to any is yes, fix it first.