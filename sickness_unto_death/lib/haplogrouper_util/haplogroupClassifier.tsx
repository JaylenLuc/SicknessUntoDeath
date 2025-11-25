// const TREEPATH = '/mtDNATree.xml';
const TREEPATH = '/mtDNATreeTest.xml';
let xmlTreeDoc : null | Document = null;
let xmlData : null | string = null;
export const returnXMLString = () => {
  return xmlData;
}
export const readAndParseTree = async () =>{
  if (xmlTreeDoc !== null) {
    console.log("XMLfile already processed")
    return;
  }
  try {
    // Use fetch API to get the file content
    const response = await fetch(TREEPATH);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    xmlData = await response.text(); // Get the text content
    // console.log(xmlData);
    const parser = new DOMParser();
    xmlTreeDoc = parser.parseFromString(xmlData, "text/xml");
    
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
  // Parse XML string to tree structure
// const parseXMLToTree = (xmlString: string | ArrayBuffer | null) => {

  
//   // Recursive function to build tree from XML
//   const buildTree = (element: Element) => {
//     if (element.tagName !== 'haplogroup') {
//       return null;
//     }
    
//     const node = {
//       name: element.getAttribute('name'),
//       mutations: [],
//       accessionNr: '',
//       reference: '',
//       children: []
//     };
    
//     // Get details (accession and reference)
//     const details = element.querySelector(':scope > details');
//     if (details) {
//       node.accessionNr = details.getAttribute('accessionNr') || '';
//       node.reference = details.getAttribute('reference') || '';
      
//       // Get all polymorphisms (mutations)
//       const polys = details.querySelectorAll(':scope > poly');
//       polys.forEach((poly: { textContent: string; }) => {
//         const mutation = poly.textContent.trim();
//         if (mutation) {
//           node.mutations.push(mutation);
//         }
//       });
//     }
    
//     // Recursively process child haplogroups
//     const childHaplogroups = element.querySelectorAll(':scope > haplogroup');
//     childHaplogroups.forEach((child: any) => {
//       const childNode = buildTree(child);
//       if (childNode) {
//         node.children.push(childNode);
//       }
//     });
    
//     return node;
//   };
  
//   // Find the root haplogroup
//   const rootHaplogroup = xmlDoc.querySelector('haplogroup');
//   if (!rootHaplogroup) {
//     throw new Error('No root haplogroup found in XML');
//   }
  
//   return buildTree(rootHaplogroup);
// };

// Parse mutations from input
// const parseMutations = (input: string) => {
//   return input
//     .split(/[\s,;]+/)
//     .map((m: string) => m.trim().toUpperCase())
//     .filter((m: string | any[]) => m.length > 0);
// };

  // Check if a mutation matches
  // const mutationMatches = (userMutation: any, treeMutation: any) => {
  //   return userMutation === treeMutation;
  // };

  // Recursive haplogroup finder with ancestral mutations
  // const findHaplogroup = (node: never, userMutations: any[], ancestralMutations = [], path = []) => {
  //   const currentPath = [...path, node.name];
  //   const allRequiredMutations = [...ancestralMutations, ...node.mutations];
    
  //   // Check if all mutations for this node (including ancestral) are present
  //   const hasAllMutations = node.mutations.every((reqMut: any) => 
  //     userMutations.some((userMut: any) => mutationMatches(userMut, reqMut))
  //   );

  //   if (!hasAllMutations) {
  //     return null;
  //   }

  //   // This node matches
  //   let bestMatch = {
  //     haplogroup: node.name,
  //     path: currentPath,
  //     matchedMutations: node.mutations,
  //     allMutations: allRequiredMutations,
  //     depth: currentPath.length
  //   };

  //   // Try to find deeper matches in children
  //   if (node.children && node.children.length > 0) {
  //     for (const child of node.children) {
  //       const childMatch = findHaplogroup(child, userMutations, allRequiredMutations, currentPath);
  //       if (childMatch && childMatch.depth > bestMatch.depth) {
  //         bestMatch = childMatch;
  //       }
  //     }
  //   }

  //   return bestMatch;
  // };

  // const classifyHaplogroup = () => {
  //   if (!phyloTree) {
  //     setResult({ error: "Please load an XML tree first" });
  //     return;
  //   }

  //   setLoading(true);
    
  //   setTimeout(() => {
  //     const userMutations = parseMutations(mutations);
      
  //     if (userMutations.length === 0) {
  //       setResult({ error: "Please enter at least one mutation" });
  //       setLoading(false);
  //       return;
  //     }

  //     const match = findHaplogroup(phyloTree, userMutations);
      
  //     if (match) {
  //       setResult({
  //         haplogroup: match.haplogroup,
  //         path: match.path,
  //         matchedMutations: match.matchedMutations,
  //         userMutations: userMutations,
  //         confidence: (match.matchedMutations.length / userMutations.length * 100).toFixed(1)
  //       });
  //     } else {
  //       setResult({
  //         error: "No matching haplogroup found in tree",
  //         userMutations: userMutations
  //       });
  //     }
      
  //     setLoading(false);
  //   }, 300);
  // };

  // Display tree structure
  // const renderTree = (node: { name: boolean | React.Key | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; mutations: any[]; children: any[]; }, depth = 0) => {
  //   if (!node) return null;
    
  //   return (
  //     <div key={node.name} style={{ marginLeft: `${depth * 20}px` }} className="my-1">
  //       <div className="flex items-center gap-2 text-sm">
  //         <span className="font-medium text-gray-700">{node.name}</span>
  //         {node.mutations.length > 0 && (
  //           <span className="text-xs text-gray-500">
  //             [{node.mutations.join(', ')}]
  //           </span>
  //         )}
  //       </div>
  //       {node.children.map((child: any) => renderTree(child, depth + 1))}
  //     </div>
  //   );
  // };

// try {
//   const tree = parseXMLToTree(testXMLString);
//   console.log(tree);
//   console.log(tree[0].name)
// }catch (error){
//   console.log("error")
// }