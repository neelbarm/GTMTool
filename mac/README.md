# The macOS backend

`axq` is a 200-line Swift command that exposes the Accessibility API as JSON, so the Node side can read any native app's UI tree and press things in it. It is what lets `--from-selection` read the text you highlighted in any app, and what the Things and Reminders task targets use.

```sh
xcode-select --install      # once
npm run build:mac           # compiles mac/axq
./mac/axq trusted           # prompts for Accessibility permission
```

Grant Accessibility to the **terminal app you run deskhand from** (Terminal, iTerm, VS Code, Warp). macOS attributes a command-line tool's permission to the app that launched it.

Try it:

```sh
./mac/axq front
./mac/axq tree --app Notes --depth 6 | head -c 2000
./mac/axq selection
```

Not built or tested on this machine: the code was written against the documented AX API and compiles with the standard frameworks, but the first build on your Mac is the first build. If `swiftc` complains, paste the error into an issue.
