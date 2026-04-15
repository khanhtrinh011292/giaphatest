"use client";

import { Person, Relationship } from "@/types";
import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";
import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { AVATAR_VERSION } from "./DefaultAvatar";

export interface BubbleMapTreeProps {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
  familyId?: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  people: Person[];
  radius: number;
  width: number;
  isRoot: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
}

const showAvatar = true;

export default function BubbleMapTree({
  personsMap,
  relationships,
  roots,
  familyId,
}: BubbleMapTreeProps) {
  void familyId;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<Error | null>(null);

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkArray: GraphLink[] = [];

    const addFamilyUnit = (
      mainPerson: Person,
      spouses: Person[],
      isRoot: boolean,
    ) => {
      if (!nodeMap.has(mainPerson.id)) {
        const people = [mainPerson, ...spouses];
        const radius = isRoot ? 40 : 30;
        const width = radius * 2 + (people.length - 1) * (radius * 1.5);

        nodeMap.set(mainPerson.id, {
          id: mainPerson.id,
          people,
          radius,
          width,
          isRoot,
        });
      }
    };

    const walk = (personId: string, visited: Set<string>) => {
      if (visited.has(personId)) return;
      visited.add(personId);

      const data = getFilteredTreeData(personId, personsMap, adj, {
        hideDaughtersInLaw: false,
        hideSonsInLaw: false,
        hideDaughters: false,
        hideSons: false,
        hideMales: false,
        hideFemales: false,
      });

      if (!data.person) return;

      const spouses = data.spouses.map((s) => s.person);
      addFamilyUnit(
        data.person,
        spouses,
        roots.some((r) => r.id === personId),
      );

      data.children.forEach((child) => {
        linkArray.push({
          source: personId,
          target: child.id,
          type: "child",
        });
        walk(child.id, new Set(visited));
      });
    };

    roots.forEach((root) => walk(root.id, new Set()));

    return { nodes: Array.from(nodeMap.values()), links: linkArray };
  }, [roots, personsMap, adj]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    try {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

    const rootNodes = nodes.filter((n) => n.isRoot);
    if (rootNodes.length === 1) {
      rootNodes[0].fx = width / 2;
      rootNodes[0].fy = height / 2;
    } else if (rootNodes.length > 1) {
      rootNodes.forEach((n, i) => {
        n.fx = width / 2 + (i - (rootNodes.length - 1) / 2) * 150;
        n.fy = height / 2;
      });
    }

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", "avatar-clip")
      .append("circle")
      .attr("r", 26)
      .attr("cx", 0)
      .attr("cy", 0);
    defs
      .append("clipPath")
      .attr("id", "avatar-clip-root")
      .append("circle")
      .attr("r", 36)
      .attr("cx", 0)
      .attr("cy", 0);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(
      zoom as unknown as (
        selection: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      ) => void,
    );

    svg.call(
      zoom.translateTo as unknown as (
        selection: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        x: number,
        y: number,
      ) => void,
      width / 2,
      height / 2,
    );

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-1200))
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => d.width / 2 + 15)
          .iterations(2),
      );

    const link = g
      .append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#d6d3d1")
      .attr("stroke-width", 2);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            svg.style("cursor", "grabbing");
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            if (!d.isRoot) {
              d.fx = null;
              d.fy = null;
            }
            svg.style("cursor", "grab");
          }) as never,
      );

    node
      .append("rect")
      .attr("x", (d) => -d.width / 2)
      .attr("y", (d) => -d.radius)
      .attr("rx", (d) => d.radius)
      .attr("ry", (d) => d.radius)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.radius * 2)
      .attr("fill", "white")
      .attr("stroke", (d) =>
        d.people[0].gender === "male" ? "#3b82f6" : "#ec4899",
      )
      .attr("stroke-width", (d) => (d.isRoot ? 4 : 2))
      .attr("class", "shadow-md transition-all hover:scale-105 cursor-pointer");

    if (showAvatar) {
      node.each(function (d) {
        const unitContent = d3.select(this);

        d.people.forEach((person, index) => {
          const totalSpacing = d.width - d.radius * 2;
          const spacingStep =
            d.people.length > 1 ? totalSpacing / (d.people.length - 1) : 0;
          const startX = -(totalSpacing / 2);
          const cx = startX + index * spacingStep;

          const avatarGroup = unitContent
            .append("g")
            .attr("transform", `translate(${cx}, 0)`);

          avatarGroup
            .append("image")
            .attr("x", -d.radius + 4)
            .attr("y", -d.radius + 4)
            .attr("width", (d.radius - 4) * 2)
            .attr("height", (d.radius - 4) * 2)
            .attr(
              "clip-path",
              d.isRoot ? "url(#avatar-clip-root)" : "url(#avatar-clip)",
            )
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr(
              "href",
              person.avatar_url ||
                (person.gender === "male"
                  ? `/avatar/${AVATAR_VERSION}/male.svg`
                  : `/avatar/${AVATAR_VERSION}/female.svg`),
            );
        });
      });
    }

    node
      .append("text")
      .attr("dy", (d) => d.radius + 18)
      .attr("text-anchor", "middle")
      .attr("fill", "#44403c")
      .attr("font-size", (d) => (d.isRoot ? "14px" : "12px"))
      .attr("font-weight", (d) => (d.isRoot ? "bold" : "normal"))
      .style("pointer-events", "none")
      .text((d) =>
        d.people.map((p) => p.full_name.split(" ").pop()).join(" & "),
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

      return () => {
        simulation.stop();
      };
    } catch (err) {
      console.error("D3 rendering error:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    }
  }, [nodes, links]);

  if (error) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-stone-50 rounded-2xl border border-stone-200/60 shadow-inner flex items-center justify-center p-4 text-center">
        <span className="text-stone-500">
          T\u00ednh n\u0103ng n\u00e0y kh\u00f4ng \u0111\u01b0\u1ee3c h\u1ed7 tr\u1ee3 tr\u00ean tr\u00ecnh duy\u1ec7t c\u1ee7a b\u1ea1n ({error.message}). Vui l\u00f2ng c\u1eadp nh\u1eadt ho\u1eb7c s\u1eed d\u1ee5ng tr\u00ecnh duy\u1ec7t kh\u00e1c.
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-stone-50 rounded-2xl border border-stone-200/60 shadow-inner">
      <div
        id="tree-toolbar-portal"
        className="absolute top-4 left-4 z-50"
      />

      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
