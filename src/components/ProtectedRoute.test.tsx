import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  it("shows a loading indicator while auth state is loading", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { getByText } = renderWithRouter();

    expect(getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to sign in", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { getByText } = renderWithRouter();

    expect(getByText("Sign In Page")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "u1", email: "test@example.com", name: "Test User" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { getByText } = renderWithRouter();

    expect(getByText("Protected Content")).toBeInTheDocument();
  });
});
