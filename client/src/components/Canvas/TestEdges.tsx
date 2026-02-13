import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * ReactFlow 边测试组件
 */
const TestEdges: React.FC = () => {
  const nodes = [
    { id: '1', position: { x: 100, y: 100 }, data: { label: 'Node 1' } },
    { id: '2', position: { x: 300, y: 100 }, data: { label: 'Node 2' } },
  ];

  const edges = [
    { id: 'e1-2', source: '1', target: '2' },
  ];

  console.log('TestEdges - nodes:', nodes);
  console.log('TestEdges - edges:', edges);

  return (
    <div style={{ width: '100%', height: '400px', background: '#1e293b' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default TestEdges;
