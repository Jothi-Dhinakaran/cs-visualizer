# CS Algorithm & System Visualizer

Offline, zero-dependency, step-by-step visualizer. **Open `index.html` in a browser** — no build, no server, no internet.

## Topics (63)
| Group | Visualizers |
|---|---|
| DSA · Sorting | Bubble · Selection · Insertion · Merge · Quick · Heap · Counting / Radix / Bucket |
| DSA · Searching & Arrays | Linear & binary search · Two pointers & sliding window · Kadane |
| DSA · Linear structures | Stack (+ balanced brackets) · Infix→postfix & evaluation · Queue / circular queue / deque · Singly & doubly/circular linked lists · Floyd cycle detection · Monotonic stack |
| DSA · Hashing | Separate chaining · Open addressing (linear / quadratic / double) |
| DSA · Trees | BST insert/search/delete · AVL rotations · Traversals · Heap · Trie · Segment tree · Fenwick tree · Red-black tree · B-tree / B+ tree · Huffman coding |
| DSA · Graphs | BFS · DFS · Dijkstra · Bellman-Ford · Floyd-Warshall · Topological sort · Union-Find · Kruskal · Prim · Tarjan SCC · A* |
| DSA · Recursion & Backtracking | Fibonacci tree + memo · Tower of Hanoi · N-Queens · Sudoku · Subset sum / subsets / permutations · Rat in a maze |
| DSA · Dynamic Programming | 0/1 Knapsack · LCS · Edit distance · LIS · Coin change · Matrix chain |
| DSA · Greedy | Activity selection · Fractional knapsack · Job sequencing |
| DSA · Strings | KMP · Rabin-Karp · Z-algorithm |
| Operating Systems | CPU scheduling (FCFS, SJF, SRTF, Round Robin + quantum slider, Gantt, live ready queue) · Page replacement (FIFO, LRU, Optimal, hit/miss ratios) |
| Networks | TCP 3-way handshake (+data, FIN close) · Sliding window (Go-Back-N / Selective Repeat with packet loss) · IPv4 subnetting & CIDR bit-level calculator (click address bits to flip them) |

**Dynamic input:** every topic has editable inputs in the left panel. Text/number fields rebuild automatically ~0.6 s after you stop typing; sliders, dropdowns and checkboxes rebuild instantly. Operation-style topics take a script such as `insert 5, delete 3, search 7` (a bare number means insert). Bad input shows a clear message instead of breaking. Use the search box above the topic list to filter topics.

Controls: Play/Pause, Step ▶ / ◀ Step, speed slider, scrubber. Keys: `←` `→` `Space` `Home`.

## AI Tutor (right panel)
* **Explain Current Step** and **Predict Next Step Quiz** (plus a **Viva Question** button and a free-form ask box) send the exact current step, pseudocode line, inputs and state to the active model.
* Modes (⚙ AI Settings, saved in `localStorage`):
  * **Rule-based offline** (default) — every step carries a built-in explanation; quizzes are graded by keyword match against the true next step. Needs nothing.
  * **Gemini** — paste a key; models `gemini-3.5-flash-lite` (default) or `gemini-3.8-flash`, or type any custom model id. Calls `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, key sent in the `x-goog-api-key` header.
  * **Ollama** — `http://localhost:11434/api/generate` with `gemma4` / `llama3.2` (or a custom id). When running from `file://`, start Ollama with `OLLAMA_ORIGINS=*`.
* Any failed model call falls back to the rule-based answer automatically.
* Model names are as you specified; if one is not available on your account, use the custom model field.

## Files
| File | Role |
|---|---|
| `index.html`, `style.css` | Layout (3 panels) and dark theme |
| `core.js` | Registry + DOM helpers |
| `dsa-common.js` | Shared DSA renderers (bars, cells, graphs, trees, grids) and input parsers |
| `dsa.js`, `dsa-sort.js`, `dsa-linear.js`, `dsa-tree.js`, `dsa-graph.js`, `dsa-paradigm.js`, `dsa-string.js` | DSA topics by section |
| `os.js`, `networks.js` | Operating-system and network topics |
| `ai-tutor.js` | AI panel, providers, quizzes |
| `app.js` | Playback engine, forms, pseudocode / state panels |

## Adding a subject
Create `mysubject.js`, call `CSViz.register({...})` (see the header of `core.js` for the shape: `inputs`, `pseudo`, `viva`, `build(params) → {steps, meta}`, `render(container, step, ctx)`), and add a `<script>` tag before `ai-tutor.js` in `index.html`. Each step needs `msg`, `why`, `line`, `state`, and whatever `view` data `render` needs; step-back, scrubbing, AI context and offline explanations then work automatically.
