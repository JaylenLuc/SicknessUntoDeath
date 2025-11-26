import { node } from "../../types/haplogroupClassifierTypes";
const TREEPATH = '/mtDNATree.xml';
let xmlTreeDoc : null | Document = null;
let xmlTreeString : null | string = null;
let phyloTree : null | node = null;
export const returnXMLString = () => {
  return xmlTreeString;
}
export const returnPhyloTree = () => {
  return phyloTree;
}
export const readAndParseTree = async () =>{
  if (xmlTreeDoc !== null) {
    console.log("XMLfile already processed")
    return;
  }
  try {
    const response = await fetch(TREEPATH);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    xmlTreeString = await response.text(); // Get the text content
    // console.log(xmlData);
    const parser = new DOMParser();
    xmlTreeDoc = parser.parseFromString(xmlTreeString, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlTreeDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed: ' + parserError.textContent);
    }
  } catch (error) {
    console.error('Error reading XML file:', error);
    throw error;
  }
  console.log("XMLfile processed successfully")
}
const buildNode = (element: Element): node | null => {
  if (element.tagName !== 'haplogroup') {
    return null;
  }
  
  const newNode : node = {
    name: element.getAttribute('name'),
    mutations: [],
    accessionNr: '',
    reference: '',
    children: []
  };
  
  // Get details (accession and reference)
  const details = element.querySelector(':scope > details');
  if (details !== null) {
    newNode.accessionNr = details.getAttribute('accessionNr') || '';
    newNode.reference = details.getAttribute('reference') || '';
    
    // Get all polymorphisms (mutations)
    const polys = details.querySelectorAll(':scope > poly');
    polys.forEach((poly: { textContent: string; }) => {
      const mutation = poly.textContent.trim();
      if (mutation !== '') {
        newNode.mutations.push(mutation);
      }
    });
  }
  
  // Recursively process all child haplogroups
  const childHaplogroups = element.querySelectorAll(':scope > haplogroup');
  childHaplogroups.forEach((childElement: Element) => {
    const childNode = buildNode(childElement);
    if (childNode !== null) {
      newNode.children.push(childNode);
    }
  });
  
  return newNode;
}
const parseXMLToTree = (): node | null => {
  if (xmlTreeDoc === null){
    console.log("tree document not loaded");
    return null;
  }
  if (phyloTree !== null){
    console.log("tree already loaded");
    return null;

  }

  // Get the root phylotree element
  const phylotreeElement = xmlTreeDoc.querySelector('phylotree');
  if (phylotreeElement === null) {
    console.log("No phylotree element found");
    return null;
  }

  // Get the top-level haplogroup(s)
  const topLevelHaplogroups = phylotreeElement.querySelectorAll(':scope > haplogroup');
  
  if (topLevelHaplogroups.length === 0) {
    console.log("No top-level haplogroups found");
    return null;
  }

  // Build the tree starting from the first top-level haplogroup
  phyloTree = buildNode(topLevelHaplogroups[0]);

  // If there are multiple top-level haplogroups, add the rest as siblings
  for (let i = 1; i < topLevelHaplogroups.length; i++) {
    const siblingNode = buildNode(topLevelHaplogroups[i]);
    if (siblingNode !== null && phyloTree !== null) {
      phyloTree.children.push(siblingNode);
    }
  }

  return phyloTree;
};

export const initializeTree = async (): Promise<node | null> => {
  await readAndParseTree();
  phyloTree = parseXMLToTree();
  console.log("Phylo tree initialized:", phyloTree);
  return phyloTree;
};

export const findHaplogroup = () => {

}