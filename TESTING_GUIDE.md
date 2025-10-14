# Phase 1 & 1.5: Testing Guide

## ✅ Agent Started Successfully!

The agent is now running with **9 tools** (execute_code disabled due to E2B SDK issue).

---

## 🧪 **Testing Checklist**

### **Test 1: Basic Shell Commands** ✅

Test that the shell command tool recognizes and executes whitelisted commands.

**Commands to try:**

```
You: check the git status
Expected: Runs 'git status', shows current branch and changes

You: what version of node am I running?
Expected: Runs 'node --version', shows v22.2.0

You: list files in the current directory
Expected: Could use list_files tool OR run 'dir/ls'

You: show me the last 5 git commits
Expected: Runs 'git log --oneline -5'
```

**Success Criteria:**

- ✅ Agent chooses run_shell_command tool
- ✅ Commands execute successfully
- ✅ Output is formatted and readable
- ✅ Git status shows "sandbox-implementation" branch

---

### **Test 2: Command Safety Features** ⚠️

Test that blocked and approval-required commands are handled correctly.

**Commands to try:**

```
You: delete all files
Expected: Blocked (contains 'rm' or 'del')

You: shutdown the computer
Expected: Blocked (system command)

You: run: git push
Expected: Asks for approval (requires user confirmation)

You: run: whoami
Expected: Blocked (not in whitelist)
```

**Success Criteria:**

- ✅ Dangerous commands blocked
- ✅ Clear explanation of why blocked
- ✅ Approval mechanism works for sensitive commands

---

### **Test 3: File Management Workflow** 📁

Test the complete file editing workflow with version control.

**Workflow to try:**

```
1. You: create a new file called test.py with a hello world function

2. You: show me what you created

3. You: edit test.py to add a goodbye function

4. You: show me the diff of what changed

5. You: actually, undo that last change

6. You: show me recent edits
```

**Success Criteria:**

- ✅ File created with correct content
- ✅ File edited successfully
- ✅ Diff shows clear before/after with colors
- ✅ Undo restores previous version
- ✅ Recent edits shows history

---

### **Test 4: Integrated Workflow** 🚀

Test multi-tool workflows that combine file creation and execution.

**Workflow to try:**

```
You: create a Python script that calculates the factorial of 5 and run it

Expected flow:
1. Agent creates factorial.py
2. Agent uses run_shell_command: python factorial.py
3. Shows output: "120"
```

**Alternative workflow:**

```
You: write a Node.js script that prints the current date, then execute it

Expected flow:
1. Agent creates date.js
2. Agent uses run_shell_command: node date.js
3. Shows current date output
```

**Success Criteria:**

- ✅ Agent chains multiple tools correctly
- ✅ File created with working code
- ✅ Code executes without errors
- ✅ Output is captured and displayed

---

### **Test 5: Error Handling** 💥

Test that errors are handled gracefully.

**Commands to try:**

```
You: run a command that doesn't exist: foobar123

You: edit a file that doesn't exist: nonexistent.txt

You: show diff for a file that was never edited

You: run python code with a syntax error
```

**Success Criteria:**

- ✅ Clear error messages
- ✅ No crashes
- ✅ Helpful suggestions for fixing issues

---

### **Test 6: Tool Selection** 🛠️

Test that the agent chooses the right tool for the job.

**Commands to try:**

```
You: what files are in the src/agent directory?
Expected: Uses list_files (not shell command)

You: read the package.json file
Expected: Uses read_file tool

You: check git status
Expected: Uses run_shell_command (git status)

You: run the tests
Expected: Uses run_shell_command (npm test)
```

**Success Criteria:**

- ✅ Correct tool selected for each task
- ✅ No unnecessary tool calls
- ✅ Efficient workflow

---

## 📊 **Test Results Template**

After testing, document your results:

```markdown
## Test Results - Phase 1 & 1.5

**Date:** October 13, 2025
**Agent Version:** 1.0.0
**Branch:** sandbox-implementation

### Summary

- Total tests: X
- Passed: Y
- Failed: Z
- Tools working: 9/10 (execute_code disabled)

### Test 1: Basic Shell Commands

Status: ✅ PASS / ❌ FAIL
Notes:

### Test 2: Command Safety Features

Status: ✅ PASS / ❌ FAIL
Notes:

### Test 3: File Management Workflow

Status: ✅ PASS / ❌ FAIL
Notes:

### Test 4: Integrated Workflow

Status: ✅ PASS / ❌ FAIL
Notes:

### Test 5: Error Handling

Status: ✅ PASS / ❌ FAIL
Notes:

### Test 6: Tool Selection

Status: ✅ PASS / ❌ FAIL
Notes:

### Issues Found

1. [Issue description]
2. [Issue description]

### Ready for Phase 2?

[ ] Yes - All critical tests passed
[ ] No - Issues need to be fixed first
```

---

## 🎯 **Quick Test Commands**

Copy and paste these one by one into the agent:

```
check git status

what version of node am I running?

create a Python file called hello.py that prints "Hello, World!"

run the hello.py file

show me what changed recently

create a JavaScript file that adds 2 + 2 and run it

list files in the src directory

read the package.json file

undo my last edit

show me the diff
```

---

## 🚨 **Known Issues**

1. **E2B execute_code tool disabled**

   - Reason: SDK has ESM/CommonJS incompatibility
   - Workaround: Use run_shell_command for code execution
   - Status: Will fix in future with Docker or wait for E2B update

2. **npm --version blocked**
   - Reason: Whitelist requires "npm run/test/start" not plain "npm"
   - Workaround: Add to whitelist or use "node --version" instead
   - Status: By design (safety feature)

---

## ✅ **What to Look For**

### Good Signs:

- ✅ Agent responds promptly
- ✅ Tool calls are appropriate
- ✅ Output is formatted nicely
- ✅ Commands execute successfully
- ✅ Errors are helpful and clear

### Bad Signs:

- ❌ Agent crashes or freezes
- ❌ Wrong tools selected
- ❌ Commands fail silently
- ❌ Confusing error messages
- ❌ Security features not working

---

## 📝 **After Testing**

Once you've completed testing:

1. **Document results** in `PHASE1_TEST_RESULTS.md`
2. **Update PHASE1_STATUS.md** with test outcomes
3. **Create GitHub commit** with test results
4. **Plan Phase 2** - Persistent Context Management

---

## 🎬 **Ready to Test?**

The agent is running in your terminal. Try the commands above and see how it performs!

**Pro tip:** Use `!` to see the tool list, and `@` to autocomplete file paths.

**To stop testing:** Press `Ctrl+C` in the terminal where the agent is running.

---

## 🚀 **Phase 2 Preview**

Once testing is complete, Phase 2 will add:

- 💾 Save conversation history to disk
- 🔄 Resume sessions after restart
- 📊 Session management tools
- 🤖 Auto-save every N interactions
- 📈 Usage statistics and analytics

**Estimated time:** 4-6 hours
