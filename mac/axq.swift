// axq — a tiny Accessibility API shell for deskhand.
// Build: sh mac/build.sh   (needs Xcode command line tools)
//
//   axq trusted                      → {"trusted":true}
//   axq apps                         → [{"name","bundle","pid"}]
//   axq front                        → {"name","bundle","pid"}
//   axq selection                    → {"text": "..."}  (focused element's selected text; falls back to ⌘C)
//   axq tree --app Mail [--depth 12] → {"title","nodes":[{"id","role","depth","title","desc","value","url","enabled"}]}
//   axq act --app Mail --id 0.3.2 --action press|setValue|focus [--value "..."]
//   axq key --key "cmd+c"            → presses a key combo in the front app
//
// Node ids are index paths from the app element ("/" is the app itself).
// Every call is stateless; deskhand re-reads the tree before it acts.

import Cocoa
import ApplicationServices

func out(_ v: Any) {
    let d = try! JSONSerialization.data(withJSONObject: v, options: [])
    FileHandle.standardOutput.write(d); FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}
func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
    var v: AnyObject?
    return AXUIElementCopyAttributeValue(el, name as CFString, &v) == .success ? v : nil
}
func str(_ v: AnyObject?) -> String? {
    guard let v = v else { return nil }
    if let s = v as? String { return s }
    if let n = v as? NSNumber { return n.stringValue }
    if let u = v as? URL { return u.absoluteString }
    if let a = v as? NSAttributedString { return a.string }
    return nil
}
func children(_ el: AXUIElement) -> [AXUIElement] { (attr(el, kAXChildrenAttribute) as? [AXUIElement]) ?? [] }

func findApp(_ name: String) -> NSRunningApplication? {
    let n = name.lowercased()
    return NSWorkspace.shared.runningApplications.first { ($0.localizedName?.lowercased() == n) || ($0.bundleIdentifier?.lowercased() == n) }
}

func walk(_ el: AXUIElement, path: [Int], depth: Int, maxDepth: Int, out nodes: inout [[String: Any]]) {
    let role = str(attr(el, kAXRoleAttribute)) ?? "AXUnknown"
    var node: [String: Any] = ["id": path.isEmpty ? "/" : path.map(String.init).joined(separator: "."), "role": role, "depth": depth]
    if let t = str(attr(el, kAXTitleAttribute)), !t.isEmpty { node["title"] = String(t.prefix(200)) }
    if let d = str(attr(el, kAXDescriptionAttribute)), !d.isEmpty { node["desc"] = String(d.prefix(200)) }
    if let h = str(attr(el, kAXHelpAttribute)), !h.isEmpty { node["help"] = String(h.prefix(200)) }
    if let v = str(attr(el, kAXValueAttribute)), !v.isEmpty { node["value"] = String(v.prefix(500)) }
    if let u = str(attr(el, kAXURLAttribute)) { node["url"] = u }
    if let e = attr(el, kAXEnabledAttribute) as? Bool { node["enabled"] = e }
    if let sub = str(attr(el, kAXSubroleAttribute)) { node["subrole"] = sub }
    nodes.append(node)
    if depth >= maxDepth || nodes.count > 20000 { return }
    for (i, c) in children(el).enumerated() { walk(c, path: path + [i], depth: depth + 1, maxDepth: maxDepth, out: &nodes) }
}

func resolve(_ root: AXUIElement, _ id: String) -> AXUIElement? {
    if id == "/" || id.isEmpty { return root }
    var el = root
    for part in id.split(separator: ".") {
        guard let i = Int(part) else { return nil }
        let cs = children(el)
        guard i < cs.count else { return nil }
        el = cs[i]
    }
    return el
}

let keyCodes: [String: CGKeyCode] = [
    "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17,
    "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29, "]": 30, "o": 31, "u": 32, "[": 33,
    "i": 34, "p": 35, "return": 36, "enter": 36, "l": 37, "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "n": 45, "m": 46, ".": 47,
    "tab": 48, "space": 49, "`": 50, "delete": 51, "backspace": 51, "escape": 53, "esc": 53, "left": 123, "right": 124, "down": 125, "up": 126,
]
func pressKey(_ combo: String) {
    var flags: CGEventFlags = []
    var key = ""
    for part in combo.lowercased().split(separator: "+").map(String.init) {
        switch part {
        case "cmd", "command", "meta": flags.insert(.maskCommand)
        case "shift": flags.insert(.maskShift)
        case "alt", "option", "opt": flags.insert(.maskAlternate)
        case "ctrl", "control": flags.insert(.maskControl)
        default: key = part
        }
    }
    guard let code = keyCodes[key] else { fail("unknown key: \(key)") }
    let src = CGEventSource(stateID: .hidSystemState)
    let down = CGEvent(keyboardEventSource: src, virtualKey: code, keyDown: true)!
    let up = CGEvent(keyboardEventSource: src, virtualKey: code, keyDown: false)!
    down.flags = flags; up.flags = flags
    down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
}

// --- argument parsing
var args = Array(CommandLine.arguments.dropFirst())
guard let cmd = args.first else { fail("usage: axq trusted|apps|front|selection|tree|act|key [--app X] [--id P] [--action A] [--value V] [--depth N] [--key K]") }
args.removeFirst()
var opt: [String: String] = [:]
var i = 0
while i < args.count {
    if args[i].hasPrefix("--"), i + 1 < args.count { opt[String(args[i].dropFirst(2))] = args[i + 1]; i += 2 } else { i += 1 }
}

switch cmd {
case "trusted":
    let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    out(["trusted": AXIsProcessTrustedWithOptions(prompt)])

case "apps":
    out(NSWorkspace.shared.runningApplications.filter { $0.activationPolicy == .regular }.map { ["name": $0.localizedName ?? "", "bundle": $0.bundleIdentifier ?? "", "pid": Int($0.processIdentifier)] })

case "front":
    guard let a = NSWorkspace.shared.frontmostApplication else { fail("no front app") }
    out(["name": a.localizedName ?? "", "bundle": a.bundleIdentifier ?? "", "pid": Int(a.processIdentifier)])

case "selection":
    let sys = AXUIElementCreateSystemWide()
    if let focused = attr(sys, kAXFocusedUIElementAttribute), let s = str(attr(focused as! AXUIElement, kAXSelectedTextAttribute)), !s.isEmpty {
        out(["text": s, "via": "ax"]); break
    }
    // Fall back to copying: remember the clipboard, ⌘C, read, restore.
    let pb = NSPasteboard.general
    let before = pb.string(forType: .string)
    let count = pb.changeCount
    pressKey("cmd+c")
    var text = ""
    for _ in 0..<20 { usleep(50_000); if pb.changeCount != count { text = pb.string(forType: .string) ?? ""; break } }
    if let b = before { pb.clearContents(); pb.setString(b, forType: .string) }
    out(["text": text, "via": "clipboard"])

case "tree":
    guard let name = opt["app"], let app = findApp(name) else { fail("app not running: \(opt["app"] ?? "?")") }
    let root = AXUIElementCreateApplication(app.processIdentifier)
    var nodes: [[String: Any]] = []
    walk(root, path: [], depth: 0, maxDepth: Int(opt["depth"] ?? "12") ?? 12, out: &nodes)
    let win = (attr(root, kAXFocusedWindowAttribute)).flatMap { str(attr($0 as! AXUIElement, kAXTitleAttribute)) } ?? app.localizedName ?? name
    out(["title": win, "nodes": nodes])

case "act":
    guard let name = opt["app"], let app = findApp(name) else { fail("app not running: \(opt["app"] ?? "?")") }
    let root = AXUIElementCreateApplication(app.processIdentifier)
    guard let id = opt["id"], let el = resolve(root, id) else { fail("no element at id \(opt["id"] ?? "?") (re-read the tree)") }
    app.activate(options: [])
    let action = opt["action"] ?? "press"
    var r: AXError
    switch action {
    case "press": r = AXUIElementPerformAction(el, kAXPressAction as CFString)
    case "setValue": r = AXUIElementSetAttributeValue(el, kAXValueAttribute as CFString, (opt["value"] ?? "") as CFTypeRef)
    case "focus": r = AXUIElementSetAttributeValue(el, kAXFocusedAttribute as CFString, kCFBooleanTrue)
    case "raise": r = AXUIElementPerformAction(el, kAXRaiseAction as CFString)
    default: fail("unknown action \(action)")
    }
    if r != .success { fail("\(action) failed with AXError \(r.rawValue)") }
    out(["ok": true, "id": id, "action": action])

case "key":
    pressKey(opt["key"] ?? "return")
    out(["ok": true])

default:
    fail("unknown command \(cmd)")
}
