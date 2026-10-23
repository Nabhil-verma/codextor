// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PlacementCheck from "../src/components/PlacementCheck";
import { PLACEMENT_CHECK, placementRoute } from "../src/data/placement";
afterEach(cleanup);
describe("six-decision placement", () => {
  it("routes five/six correct to specs and beginners to web without mastery credit", () => {
    const answers=PLACEMENT_CHECK.map(q=>q.answer);
    expect(placementRoute(answers)).toBe('/learn/agents/specs-and-prompts');
    expect(placementRoute(answers.map(a=>(a+1)%3))).toBe('/learn/web/html-semantic');
    expect(()=>placementRoute([])).toThrow();
  });
  it("works through the learner-facing form", () => {
    render(<MemoryRouter><PlacementCheck /></MemoryRouter>);
    for (const q of PLACEMENT_CHECK) fireEvent.click(screen.getByLabelText(q.options[q.answer]));
    fireEvent.click(screen.getByRole('button',{name:'Find my path'}));
    expect(screen.getByRole('status').textContent).toContain('Experienced entry');
    expect(screen.getByRole('link',{name:'Open recommended lesson'}).getAttribute('href')).toBe('/learn/agents/specs-and-prompts');
  });
});
