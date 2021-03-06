import storage from '@/components/shared/PersistentStorage';

export const META_CONCEPTS = new Set(['entity', 'relationship', 'attribute', 'role']);

export async function computeSubConcepts(nodes) {
  const edges = [];
  const subConcepts = [];
  await Promise.all(nodes.map(async (concept) => {
    const sup = await concept.sup();
    if (sup) {
      const supLabel = await sup.label();
      if (!META_CONCEPTS.has(supLabel)) {
        edges.push({ from: concept.id, to: sup.id, label: 'sub' });
        subConcepts.push(concept);
      }
    }
  }));
  return { nodes: subConcepts, edges };
}

export async function relationshipTypesOutboundEdges(nodes) {
  const edges = [];
  const promises = nodes.filter(x => x.isRelationshipType())
    .map(async rel =>
      Promise.all(((await (await rel.roles()).collect())).map(async (role) => {
        const types = await (await role.players()).collect();
        const label = await role.label();
        return types.forEach((type) => { edges.push({ from: rel.id, to: type.id, label }); });
      })),
    );
  await Promise.all(promises);
  return edges;
}

export async function ownerHasEdges(nodes) {
  const edges = [];

  await Promise.all(nodes.map(async (node) => {
    const sup = await node.sup();

    if (sup) {
      const supLabel = await sup.label();

      if (META_CONCEPTS.has(supLabel)) {
        let attributes = await node.attributes();
        attributes = await attributes.collect();
        attributes.map(attr => edges.push({ from: node.id, to: attr.id, label: 'has' }));
      } else { // if node has a super type which is not a META_CONCEPT construct edges to attributes expect those which are inherited from its super type
        const supAttributeIds = (await (await sup.attributes()).collect()).map(x => x.id);

        const attributes = (await (await node.attributes()).collect()).filter(attr => !supAttributeIds.includes(attr.id));
        attributes.map(attr => edges.push({ from: node.id, to: attr.id, label: 'has' }));
      }
    }
  }));
  return edges;
}

export function updateNodePositions(nodes) {
  let positionMap = storage.get('schema-node-positions');
  if (positionMap) {
    positionMap = JSON.parse(positionMap);
    nodes.forEach((node) => {
      if (node.id in positionMap) {
        const { x, y } = positionMap[node.id];
        Object.assign(node, { x, y, fixed: { x: true, y: true } });
      }
    });
  }
  return nodes;
}

export async function loadMetaTypeInstances(graknTx) {
  // Fetch types
  const entities = await (await graknTx.query('match $x sub entity; get;')).collectConcepts();
  const rels = await (await graknTx.query('match $x sub relationship; get;')).collectConcepts();
  const attributes = await (await graknTx.query('match $x sub attribute; get;')).collectConcepts();
  const roles = await (await graknTx.query('match $x sub role; get;')).collectConcepts();

  // Get types labels
  const metaTypeInstances = {};
  metaTypeInstances.entities = await Promise.all(entities.map(type => type.label()))
    .then(labels => labels.filter(l => l !== 'entity')
      .concat()
      .sort());
  metaTypeInstances.relationships = await Promise.all(rels.map(async type => ((!await type.isImplicit()) ? type.label() : null)))
    .then(labels => labels.filter(l => l && l !== 'relationship')
      .concat()
      .sort());
  metaTypeInstances.attributes = await Promise.all(attributes.map(type => type.label()))
    .then(labels => labels.filter(l => l !== 'attribute')
      .concat()
      .sort());
  metaTypeInstances.roles = await Promise.all(roles.map(async type => ((!await type.isImplicit()) ? type.label() : null)))
    .then(labels => labels.filter(l => l && l !== 'role')
      .concat()
      .sort());
  return metaTypeInstances;
}

export async function typeInboundEdges(type, visFacade) {
  const roles = await (await type.playing()).collect();
  const relationshipTypes = await Promise.all(roles.map(async role => (await role.relationships()).collect())).then(rels => rels.flatMap(x => x));
  return relationshipTypesOutboundEdges(relationshipTypes.filter(rel => visFacade.getNode(rel)));
}

// attach attribute labels and data types to each node
export async function computeAttributes(nodes) {
  return Promise.all(nodes.map(async (node) => {
    const attributes = await (await node.attributes()).collect();
    node.attributes = await Promise.all(attributes.map(async concept => ({ type: await concept.label(), dataType: await concept.dataType() })));
    return node;
  }));
}

