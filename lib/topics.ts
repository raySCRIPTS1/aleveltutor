export const SUBJECTS = ["Mathematics", "Further Mathematics", "Physics"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const TOPICS: Record<Subject, string[]> = {
  Mathematics: ["Proof", "Algebra and functions", "Coordinate geometry", "Sequences and series", "Trigonometry", "Exponentials and logarithms", "Differentiation", "Integration", "Numerical methods", "Vectors", "Statistics: sampling and distributions", "Statistics: hypothesis testing", "Mechanics: kinematics", "Mechanics: forces and Newton's laws", "Mechanics: moments"],
  "Further Mathematics": ["Complex numbers", "Argand diagrams", "Series and induction", "Roots of polynomials", "Volumes of revolution", "Matrices", "Linear transformations", "Vectors and 3D geometry", "Hyperbolic functions", "Polar coordinates", "Differential equations", "Maclaurin series", "Further statistics", "Further mechanics"],
  Physics: ["Measurements and errors", "Particles and radiation", "Quantum phenomena", "Waves", "Optics", "Mechanics and materials", "Electricity", "Further mechanics and thermal physics", "Fields and their consequences", "Gravitational fields", "Electric fields", "Capacitance", "Magnetic fields and electromagnetic induction", "Nuclear physics", "Practical skills", "Option: Astrophysics"],
};
