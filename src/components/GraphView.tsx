import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useAppStore, GraphNode } from "../stores/useAppStore";
import { Loader2, Search, X } from "lucide-react";

// 扩展 GraphNode 以包含 D3 需要的属性
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

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 清除之前的内容
    svg.selectAll("*").remove();

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // 过滤节点和边
    let filteredNodes = graphData.nodes as D3Node[];
    let filteredEdges = graphData.edges as D3Edge[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchingNodes = graphData.nodes.filter(
        (n) => n.title.toLowerCase().includes(query)
      );
      const matchingNodeIds = new Set(matchingNodes.map((n) => n.id));

      // 包含匹配节点的邻居
      const neighborIds = new Set<string>();
      graphData.edges.forEach((e) => {
        if (matchingNodeIds.has(e.source)) neighborIds.add(e.target);
        if (matchingNodeIds.has(e.target)) neighborIds.add(e.source);
      });

      const allRelevantIds = new Set([...matchingNodeIds, ...neighborIds]);

      filteredNodes = graphData.nodes.filter((n) => allRelevantIds.has(n.id)) as D3Node[];
      filteredEdges = graphData.edges.filter(
        (e) => allRelevantIds.has(e.source) && allRelevantIds.has(e.target)
      ) as D3Edge[];
    }

    // 创建力导向模拟
    const simulation = d3.forceSimulation<D3Node>(filteredNodes)
      .force("link", d3.forceLink<D3Node, D3Edge>(filteredEdges).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody<D3Node>().strength(-200))
      .force("center", d3.forceCenter<D3Node>(width / 2, height / 2))
      .force("collision", d3.forceCollide<D3Node>().radius(30));

    simulationRef.current = simulation;

    // 创建连线
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredEdges)
      .enter()
      .append("line")
      .attr("stroke", "rgba(148, 163, 184, 0.15)")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6);

    // 创建节点组
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // 节点圆圈
    node.append("circle")
      .attr("r", (d) => Math.max(8, Math.min(20, 8 + d.connection_count * 2)))
      .attr("fill", (d) => {
        if (selectedNode === d.id) return "var(--accent)";
        if (d.tag_count > 0) return "var(--success)";
        return "var(--text-muted)";
      })
      .attr("stroke", "var(--bg-primary)")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelectedNode(d.id === selectedNode ? null : d.id);
        openFile(d.id, d.title);
      })
      .on("mouseover", function(_event, d) {
        d3.select(this).attr("r", Math.max(12, Math.min(25, 12 + d.connection_count * 2)));
        // 高亮相关连线
        link.attr("stroke-opacity", (l) => {
          const source = typeof l.source === 'object' ? l.source.id : l.source;
          const target = typeof l.target === 'object' ? l.target.id : l.target;
          return source === d.id || target === d.id ? 1 : 0.1;
        });
      })
      .on("mouseout", function(_event, d) {
        d3.select(this).attr("r", Math.max(8, Math.min(20, 8 + d.connection_count * 2)));
        link.attr("stroke-opacity", 0.6);
      });

    // 节点标签
    node.append("text")
      .text((d) => d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title)
      .attr("dy", 28)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-secondary)")
      .attr("font-size", "10px")
      .style("pointer-events", "none");

    // 更新模拟
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x ?? 0)
        .attr("y1", (d) => (d.source as D3Node).y ?? 0)
        .attr("x2", (d) => (d.target as D3Node).x ?? 0)
        .attr("y2", (d) => (d.target as D3Node).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // 清理函数
    return () => {
      simulation.stop();
    };
  }, [graphData, searchQuery, selectedNode, openFile]);

  useEffect(() => {
    const cleanup = renderGraph();
    return cleanup;
  }, [renderGraph]);

  if (isLoadingGraph) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: "var(--accent)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            加载图谱数据...
          </p>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center">
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            暂无图谱数据
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            创建一些笔记和链接后，图谱将自动显示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* 搜索栏：融入背景 */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md"
            style={{
              backgroundColor: "rgba(17, 24, 39, 0.6)",
              backdropFilter: "blur(8px)",
              border: "none",
              color: "var(--text-primary)",
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </div>

      {/* 图谱 */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ backgroundColor: "var(--bg-primary)" }}
        />

        {/* 图例：毛玻璃效果 */}
        <div
          className="absolute bottom-4 left-4 px-3 py-2 rounded-md"
          style={{
            backgroundColor: "rgba(17, 24, 39, 0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--text-muted)" }} />
              <span>普通</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
              <span>有标签</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
              <span>选中</span>
            </div>
          </div>
        </div>

        {/* 统计信息：毛玻璃效果 */}
        <div
          className="absolute bottom-4 right-4 px-3 py-2 rounded-md"
          style={{
            backgroundColor: "rgba(17, 24, 39, 0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span>{graphData.nodes.length} 节点</span>
            <span className="mx-1.5">·</span>
            <span>{graphData.edges.length} 连接</span>
          </div>
        </div>
      </div>
    </div>
  );
}
