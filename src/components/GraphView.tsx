import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useAppStore, GraphNode } from "../stores/useAppStore";
import { Loader2, Search, X, ArrowLeft } from "lucide-react";

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

interface GraphViewProps {
  onBack?: () => void;
}

export function GraphView({ onBack }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphData, isLoadingGraph, loadGraphData, openFile, files, vaultPath } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData, vaultPath]);

  // 如果后端图谱为空但有文件，用文件列表构建节点
  const effectiveNodes = graphData?.nodes && graphData.nodes.length > 0
    ? graphData.nodes
    : files.filter(f => !f.is_dir).map(f => ({
        id: f.path,
        title: f.name.replace(/\.md$/, ""),
        tag_count: 0,
        connection_count: 0,
      }));

  const effectiveEdges = graphData?.edges || [];

  const renderGraph = useCallback(() => {
    const container = containerRef.current;
    if (!svgRef.current || !container) return;
    if (effectiveNodes.length === 0) return;

    try {
      setError(null);
      const svg = d3.select(svgRef.current);
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      svg.selectAll("*").remove();

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => { g.attr("transform", event.transform); });

      svg.call(zoom);

      // 初始居中
      svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2));

      const g = svg.append("g");

      let filteredNodes = effectiveNodes as D3Node[];
      let filteredEdges = effectiveEdges as D3Edge[];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchingNodes = effectiveNodes.filter((n) => n.title.toLowerCase().includes(query));
        const matchingNodeIds = new Set(matchingNodes.map((n) => n.id));
        const neighborIds = new Set<string>();
        effectiveEdges.forEach((e) => {
          if (matchingNodeIds.has(e.source)) neighborIds.add(e.target);
          if (matchingNodeIds.has(e.target)) neighborIds.add(e.source);
        });
        const allRelevantIds = new Set([...matchingNodeIds, ...neighborIds]);
        filteredNodes = effectiveNodes.filter((n) => allRelevantIds.has(n.id)) as D3Node[];
        filteredEdges = effectiveEdges.filter((e) => allRelevantIds.has(e.source) && allRelevantIds.has(e.target)) as D3Edge[];
      }

      const simulation = d3.forceSimulation<D3Node>(filteredNodes)
        .force("link", filteredEdges.length > 0
          ? d3.forceLink<D3Node, D3Edge>(filteredEdges).id((d) => d.id).distance(120)
          : null
        )
        .force("charge", d3.forceManyBody<D3Node>().strength(-300))
        .force("center", d3.forceCenter<D3Node>(0, 0))
        .force("collision", d3.forceCollide<D3Node>().radius(40))
        .force("x", d3.forceX(0).strength(0.05))
        .force("y", d3.forceY(0).strength(0.05));

      simulationRef.current = simulation;

      // 连线
      if (filteredEdges.length > 0) {
        g.append("g")
          .selectAll("line")
          .data(filteredEdges)
          .enter()
          .append("line")
          .attr("stroke", "#2a2a3c")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.5);
      }

      // 节点组
      const node = g.append("g")
        .selectAll("g")
        .data(filteredNodes)
        .enter()
        .append("g")
        .style("cursor", "pointer")
        .on("click", (_event, d) => {
          openFile(d.id, d.title);
        });

      // 节点圆圈
      node.append("circle")
        .attr("r", (d) => Math.max(5, Math.min(14, 6 + d.connection_count * 2)))
        .attr("fill", (d) => d.connection_count > 0 ? "#4f8eff" : "#5a5a7a")
        .attr("stroke", "#0a0a0f")
        .attr("stroke-width", 2)
        .on("mouseover", function(this: SVGCircleElement, _event: MouseEvent, d: D3Node) {
          d3.select(this)
            .attr("r", Math.max(7, Math.min(16, 8 + d.connection_count * 2)))
            .attr("fill", "#4f8eff");
          // 高亮相关连线
          g.selectAll("line")
            .attr("stroke-opacity", (l: any) => {
              const src = typeof l.source === 'object' ? l.source.id : l.source;
              const tgt = typeof l.target === 'object' ? l.target.id : l.target;
              return src === d.id || tgt === d.id ? 1 : 0.08;
            });
          // 高亮相关节点
          g.selectAll("circle")
            .attr("opacity", (n: any) => {
              if (n.id === d.id) return 1;
              const isConnected = effectiveEdges.some((e: any) => {
                const s = typeof e.source === 'object' ? e.source.id : e.source;
                const t = typeof e.target === 'object' ? e.target.id : e.target;
                return (s === d.id && t === n.id) || (t === d.id && s === n.id);
              });
              return isConnected ? 1 : 0.2;
            });
        })
        .on("mouseout", function(this: SVGCircleElement) {
          d3.select(this)
            .attr("r", (d: any) => Math.max(5, Math.min(14, 6 + d.connection_count * 2)))
            .attr("fill", (d: any) => d.connection_count > 0 ? "#4f8eff" : "#5a5a7a");
          g.selectAll("line").attr("stroke-opacity", 0.5);
          g.selectAll("circle").attr("opacity", 1);
        });

      // 拖拽
      node.call(d3.drag<SVGGElement, D3Node>()
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

      // 节点标签
      node.append("text")
        .text((d) => d.title.length > 12 ? d.title.substring(0, 12) + "..." : d.title)
        .attr("dy", (d) => Math.max(5, Math.min(14, 6 + d.connection_count * 2)) + 14)
        .attr("text-anchor", "middle")
        .attr("fill", "#8b8baa")
        .attr("font-size", "11px")
        .style("pointer-events", "none");

      // tick
      const linkLines = g.selectAll("line");
      simulation.on("tick", () => {
        linkLines
          .attr("x1", (d: any) => (d.source as D3Node).x ?? 0)
          .attr("y1", (d: any) => (d.source as D3Node).y ?? 0)
          .attr("x2", (d: any) => (d.target as D3Node).x ?? 0)
          .attr("y2", (d: any) => (d.target as D3Node).y ?? 0);
        node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      return () => { simulation.stop(); };
    } catch (err) {
      console.error("图谱渲染失败:", err);
      setError("图谱渲染出错");
    }
  }, [effectiveNodes, effectiveEdges, searchQuery, openFile]);

  useEffect(() => {
    const cleanup = renderGraph();
    return cleanup;
  }, [renderGraph]);

  // 空状态
  if (!isLoadingGraph && effectiveNodes.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)", position: "relative" }}>
        {onBack && (
          <button className="icon-btn" style={{ position: "absolute", top: "var(--space-3)", left: "var(--space-3)", width: 28, height: 28 }} onClick={onBack} title="返回编辑器">
            <ArrowLeft size={16} />
          </button>
        )}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-1)" }}>暂无图谱数据</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>在左侧文件树打开一个 Vault 文件夹</p>
        </div>
      </div>
    );
  }

  // 加载中
  if (isLoadingGraph && !graphData) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", margin: "0 auto var(--space-2)", display: "block" }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>加载图谱数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", backgroundColor: "var(--bg-app)" }}>
      {/* 顶部工具栏 */}
      <div style={{ position: "absolute", top: "var(--space-3)", left: "var(--space-3)", right: "var(--space-3)", zIndex: 10, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {onBack && (
          <button className="icon-btn glass" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={onBack} title="返回编辑器">
            <ArrowLeft size={16} />
          </button>
        )}
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            className="glass"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            style={{
              width: "100%", padding: "0 28px 0 32px", height: 32,
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              borderRadius: "var(--radius-md)",
              border: "none", color: "var(--text-primary)",
            }}
          />
          {searchQuery && (
            <button
              style={{ position: "absolute", right: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", cursor: "pointer" }}
              onClick={() => setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{ position: "absolute", top: "var(--space-12)", left: "50%", transform: "translateX(-50%)", zIndex: 10, padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)", backgroundColor: "var(--danger-bg)", color: "var(--danger)", fontSize: "var(--text-xs)" }}>
          {error}
        </div>
      )}

      {/* SVG 图谱区域 */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-app)" }} />

        {/* 图例 */}
        <div className="glass" style={{ position: "absolute", bottom: "var(--space-4)", left: "var(--space-4)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", fontSize: 11, color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: "#5a5a7a" }} />
              <span>文件</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: "#4f8eff" }} />
              <span>有链接</span>
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="glass" style={{ position: "absolute", bottom: "var(--space-4)", right: "var(--space-4)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            <span>{effectiveNodes.length} 文件</span>
            <span style={{ margin: "0 var(--space-2)" }}>·</span>
            <span>{effectiveEdges.length} 链接</span>
          </div>
        </div>
      </div>
    </div>
  );
}
