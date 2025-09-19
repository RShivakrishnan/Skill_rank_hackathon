// script.js — simple client-side renderer and basic text parser

// Sample demo data (click "Load sample paper")
const sampleData = {
  "title": "Attention Is All You Need (sample)",
  "abstract": "We propose the Transformer, a model architecture based solely on attention mechanisms...",
  "sections": [
    { "heading": "Introduction", "text": "The field of sequence modelling has relied on recurrent and convolutional networks..." },
    { "heading": "Model", "text": "The Transformer uses multi-head self-attention and position-wise feed-forward layers..." },
    { "heading": "Experiments", "text": "We evaluate on translation tasks and achieve competitive results. Details and hyperparams are described." }
  ],
  "keywords": ["transformer","attention","sequence","translation"]
};

// --- renderer ---
function renderPaper(data) {
  document.getElementById('title').textContent = data.title || "No title";
  document.getElementById('abstract').textContent = data.abstract || "No abstract found.";
  const secBox = document.getElementById('sections');
  secBox.innerHTML = "";
  (data.sections || []).forEach((s, idx) => {
    const div = document.createElement('div');
    div.className = 'section';
    const h = document.createElement('h3');
    h.textContent = s.heading || `Section ${idx+1}`;
    const p = document.createElement('p');
    p.textContent = s.text || "";
    div.appendChild(h); div.appendChild(p);
    secBox.appendChild(div);
  });

  const kwBox = document.getElementById('keyword-list');
  kwBox.innerHTML = "";
  (data.keywords || []).forEach(k => {
    const li = document.createElement('li'); li.textContent = k;
    kwBox.appendChild(li);
  });
}

// --- quick keyword extractor used by plain text parser ---
function getKeywords(text, n=8) {
  const stopwordsArr = [
    "the","and","for","that","with","this","from","are","was","were","have","has","had","not","but","they",
    "their","which","also","been","using","use","paper","model","we","our","a","an","in","on","of","to","is","it"
  ];
  const stop = new Set(stopwordsArr);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const freq = {};
  words.forEach(w => { if (!stop.has(w) && w.length>2) freq[w] = (freq[w]||0)+1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);
}

// --- very simple plain-text parser: paragraphs by blank-line ---
function parsePlainText(content) {
  const paras = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const title = paras[0] || "Unknown title";
  const abstract = paras[1] || paras.slice(1,3).join("\n\n") || "";
  const rest = paras.slice(2);
  // Make sections: if user included headings like "## Heading", respect them
  let sections = [];
  if (content.includes("\n## ")) {
    // parse markdown-like headings
    const parts = content.split(/\n##\s+/).map(p => p.trim()).filter(Boolean);
    parts.forEach((part,i) => {
      if (i===0 && !part.startsWith("##")) {
        // first chunk might include title/abstract; skip if short
        sections.push({ heading: "Intro", text: part });
      } else {
        const firstLine = part.split("\n")[0].trim();
        const body = part.split("\n").slice(1).join("\n").trim();
        sections.push({ heading: firstLine || `Section ${i}`, text: body });
      }
    });
  } else {
    // fallback: group every 3 paragraphs into one section
    for (let i=0; i<rest.length; i+=3) {
      const heading = `Section ${Math.floor(i/3)+1}`;
      const text = rest.slice(i,i+3).join("\n\n");
      sections.push({ heading, text });
    }
    if (sections.length===0 && rest.length>0) sections = [{ heading: "Content", text: rest.join("\n\n") }];
  }

  const keywords = getKeywords(content, 8);
  return { title, abstract, sections, keywords };
}

// --- file input handling ---
document.getElementById('load-sample').addEventListener('click', () => renderPaper(sampleData));

document.getElementById('file-input').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsedJson = JSON.parse(reader.result);
      renderPaper(parsedJson);
    } catch (err) {
      // not JSON -> treat as plain text
      const parsed = parsePlainText(reader.result);
      renderPaper(parsed);
    }
  };
  reader.readAsText(f);
});

// Try to load paper.json from same folder (works if you run a local server):
document.getElementById('open-local-json').addEventListener('click', async () => {
  try {
    const resp = await fetch('paper.json');
    if (!resp.ok) throw new Error("No paper.json found or server not running");
    const obj = await resp.json();
    renderPaper(obj);
  } catch (err) {
    alert("Could not load paper.json. If you opened the file via file://, use a local server or load a file with the 'Load JSON or TXT' input.");
    console.log(err);
  }
});
