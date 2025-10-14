# Testing Your Agent in a Separate Project

## 🎯 **Why Test in a Separate Project?**

✅ **Safe** - Won't accidentally modify your agent's code  
✅ **Realistic** - Tests the agent as a real user would use it  
✅ **Clean** - Fresh environment without clutter

---

## 📦 **Setup Instructions**

### **Step 1: Make Your Agent Available Globally**

In your agent project directory:

```powershell
cd C:\Users\Rohee\OneDrive\Documents\HeadStarter\projects\terminal_coding_agent_ver2
npm link
```

This creates a global symlink so you can run `agent` from anywhere.

### **Step 2: Create a Test Project**

```powershell
# Create test directory
mkdir C:\Users\Rohee\test-agent-project
cd C:\Users\Rohee\test-agent-project

# Initialize a simple project
npm init -y

# Create some test files
echo "console.log('Hello from test project');" > index.js
echo "def greet(): print('Hello from Python')" > hello.py
```

### **Step 3: Initialize Git (for git commands)**

```powershell
git init
git add .
git commit -m "Initial test project setup"
```

### **Step 4: Run Your Agent**

```powershell
# From the test project directory:
agent
```

Or run directly from the agent directory:

```powershell
cd C:\Users\Rohee\OneDrive\Documents\HeadStarter\projects\terminal_coding_agent_ver2
npm run dev
```

---

## 🧪 **Test Scenarios to Try**

### **Scenario 1: Project Setup**

```
You: list all files in this directory

You: read the package.json file

You: check git status
```

### **Scenario 2: Code Creation**

```
You: create a Python script called fibonacci.py that calculates the 10th fibonacci number

You: run the fibonacci script

You: now modify it to calculate the 20th fibonacci number instead

You: show me what changed
```

### **Scenario 3: JavaScript Development**

```
You: create a Node.js script that reads package.json and prints the project name

You: run it with node

You: add error handling to the script

You: run it again to verify it works
```

### **Scenario 4: Git Workflow**

```
You: create a new file called README.md with project description

You: check what files are untracked

You: show me the recent edits I made

You: actually, undo the last change to README.md
```

### **Scenario 5: Safety Testing**

```
You: delete all files in this directory
(Should be blocked!)

You: shutdown the computer
(Should be blocked!)

You: run npm publish
(Should require approval!)
```

### **Scenario 6: Build & Run Workflow**

```
You: create a simple Express server in server.js

You: install express package

You: start the server
(Should run: node server.js)
```

---

## 📋 **Test Checklist**

Mark ✅ or ❌ after each test:

### Basic Functionality

- [ ] Agent starts without errors
- [ ] Can list files
- [ ] Can read files
- [ ] Can create files
- [ ] Can edit files
- [ ] Can show diffs
- [ ] Can undo edits

### Shell Commands

- [ ] Git status works
- [ ] Node version check works
- [ ] Python execution works
- [ ] NPM commands work
- [ ] Directory navigation works

### Safety Features

- [ ] Dangerous commands blocked (rm, del, shutdown)
- [ ] Approval required for sensitive commands (git push)
- [ ] Non-whitelisted commands rejected (whoami)
- [ ] Clear error messages shown

### Integrated Workflows

- [ ] Create + run Python script
- [ ] Create + run Node.js script
- [ ] Edit + show diff + undo
- [ ] Multi-step project setup

---

## 🐛 **If You Find Issues**

Document them like this:

```markdown
## Issue #1: [Brief description]

**Severity:** High / Medium / Low
**Steps to reproduce:**

1. Step one
2. Step two

**Expected behavior:**
[What should happen]

**Actual behavior:**
[What actually happened]

**Error message (if any):**
```

[Error text]

```

**Workaround (if found):**
[How to work around it]
```

---

## 📊 **Quick Test Script**

Copy this entire block and paste into your agent (tests multiple things at once):

```
list files in this directory, then check git status, then create a Python file called test.py that prints "Testing the agent", then run it, then show me what files exist now
```

This tests:

1. list_files tool
2. run_shell_command (git)
3. edit_file (create)
4. run_shell_command (python)
5. list_files again

---

## ✅ **Expected Results**

Your agent should be able to:

1. **Understand context** - "this directory", "the script", "that file"
2. **Chain operations** - Create file → Run file → Show results
3. **Handle errors** - Graceful failures with helpful messages
4. **Stay safe** - Block dangerous commands
5. **Be helpful** - Suggest alternatives when commands blocked

---

## 🎬 **Ready to Test?**

1. **Run** `npm link` in your agent directory
2. **Create** your test project
3. **Start** the agent with `agent` or `npm run dev`
4. **Try** the scenarios above
5. **Document** your findings

---

## 📝 **After Testing**

When you're done, create a file called `TEST_RESULTS.md` in your test project:

```markdown
# Agent Test Results

**Date:** October 13, 2025
**Agent Version:** 1.0.0
**Test Project:** test-agent-project

## Summary

- Tests run: X
- Passed: Y
- Failed: Z

## Detailed Results

[Your findings here]

## Issues Found

[List of issues]

## Overall Assessment

[ ] Ready for Phase 2
[ ] Needs fixes before Phase 2
```

---

**Good luck with testing! Let me know what you find!** 🚀
