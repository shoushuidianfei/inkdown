import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useAppStore, GraphNode } from "../stores/useAppStore";
import { Loader2, Search, X } from "lucide-react";

interface D3Node extends GraphNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Edge extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string;
  target: D3Node | string;
}

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { graphData, isLoadingGraph, loadGraphData, openFile } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);

  useEffect(() => { loadGraphData(); }, [loadGraphData]);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform); });

    svg.call(zoom);
    const g = svg.append("g");

    let filteredNodes = graphData.nodes as D3Node[];
    let filteredEdges = graphData.edges as D3Edge[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchingNodes = graphData.nodes.filter((n) => n.title.toLowerCase().includes(query));
      const matchingNodeIds = new Set(matchingNodes.map((n) => n.id));
      const neighborIds = new Set<string>();
      graphData.edges.forEach((e) => {
        if (matchingNodeIds.has(e.source)) neighborIds.add(e.target);
        if (matchingNodeIds.has(e.target)) neighborIds.add(e.source);
      });
      const allRelevantIds = new Set([...matchingNodeIds, ...neighborIds]);
      filteredNodes = graphData.nodes.filter((n) => allRelevantIds.has(n.id)) as D3Node[];
      filteredEdges = graphData.edges.filter((e) => allRelevantIds.has(e.source) && allRelevantIds.has(e.target)) as D3Edge[];
    }

    const simulation = d3.forceSimulation<D3Node>(filteredNodes)
      .force("link", d3.forceLink<D3Node, D3Edge>(filteredEdges).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody<D3Node>().strength(-200))
      .force("center", d3.forceCenter<D3Node>(width / 2, height / 2))
      .force("collision", d3.forceCollide<D3Node>().radius(30));

    simulationRef.current = simulation;

    // 连线: --gray-700
    const link = g.append("g")
      .selectAll("line")
      .data(filteredEdges)
      .enter()
      .append("line")
      .attr("stroke", "var(--gray-700)")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6);

    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // 节点: 6px base radius, --gray-400 default, --accent active
    node.append("circle")
      .attr("r", (d) => Math.max(4, Math.min(10, 6 + d.connection_count)))
      .attr("fill", (d) => {
        if (selectedNode === d.id) return "var(--accent)";
        return "var(--gray-400)";
      })
      .attr("stroke", "var(--gray-950)")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelectedNode(d.id === selectedNode ? null : d.id);
        openFile(d.id, d.title);
      })
      .on("mouseover", function(_event, d) {
        d3.select(this).attr("r", Math.max(6, Math.min(12, 8 + d.connection_count)));
        link.attr("stroke-opacity", (l) => {
          const source = typeof l.source === 'object' ? l.source.id : l.source;
          const target = typeof l.target === 'object' ? l.target.id : l.target;
          return source === d.id || target === d.id ? 1 : 0.1;
        });
      })
      .on("mouseout", function(_event, d) {
        d3.select(this).attr("r", Math.max(4, Math.min(10, 6 + d.connection_count)));
        link.attr("stroke-opacity", 0.6);
      });

    // 节点标签: 11px, --text-tertiary
    node.append("text")
      .text((d) => d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title)
      .attr("dy", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-tertiary)")
      .attr("font-size", "11px")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x ?? 0)
        .attr("y1", (d) => (d.source as D3Node).y ?? 0)
        .attr("x2", (d) => (d.target as D3Node).x ?? 0)
        .attr("y2", (d) => (d.target as D3Node).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [graphData, searchQuery, selectedNode, openFile]);

  useEffect(() => { const cleanup = renderGraph(); return cleanup; }, [renderGraph]);

  if (isLoadingGraph) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--gray-950)" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>加载图谱数据...</p>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--gray-950)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 4 }}>暂无图谱数据</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>创建一些笔记和链接后，图谱将自动显示</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", backgroundColor: "var(--gray-950)" }}>
      {/* 搜索栏 */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            style={{
              width: "100%", padding: "0 28px 0 32px", height: 32,
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(13,13,18,0.6)", backdropFilter: "blur(8px)",
              border: "none", color: "var(--text-primary)",
            }}
          />
          {searchQuery && (
            <button
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
              onClick={() => setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 图谱 */}
      <div style={{ flex: 1, position: "relative" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%", backgroundColor: "var(--gray-950)" }} />

        {/* 图例 */}
        <div
          style={{
            position: "absolute", bottom: 16, left: 16,
            padding: "8px 12px", borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(13,13,18,0.6)", backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: "var(--gray-400)" }} />
              <span>普通</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: "var(--accent)" }} />
              <span>选中</span>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div
          style={{
            position: "absolute", bottom: 16, right: 16,
            padding: "8px 12px", borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(13,13,18,0.6)", backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            <span>{graphData.nodes.length} 节点</span>
            <span style={{ margin: "0 6px" }}>·</span>
            <span>{graphData.edges.length} 连接</span>
          </div>
        </div>
      </div>
    </div>
  );
}
