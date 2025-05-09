import { memo } from "react";

function PaginationUser({ totalPage, currentPage, handleChangePage }) {
  return (
    <>
      {totalPage > 1 && (
        <div className="col-md-12">
          <nav aria-label="Page navigation example">
            <ul className="pagination justify-content-center">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <a
                  role="button"
                  className="page-link"
                  onClick={() => handleChangePage(currentPage - 1)}
                >
                  Previous
                </a>
              </li>
              {Array.from({ length: totalPage }).map((p, i) =>
                i + 1 === currentPage ? (
                  <li key={i} className="page-item active" aria-current="page">
                    <span
                      role="button"
                      className="page-link"
                      onClick={() => handleChangePage(i + 1)}
                    >
                      {i + 1}
                    </span>
                  </li>
                ) : (
                  <li key={i} className="page-item">
                    <a
                      className="page-link"
                      role="button"
                      onClick={() => handleChangePage(i + 1)}
                    >
                      {i + 1}
                    </a>
                  </li>
                )
              )}
              <li
                className={`page-item ${
                  currentPage === totalPage ? "disabled" : ""
                }`}
              >
                <a
                  role="button"
                  className="page-link"
                  onClick={() => handleChangePage(currentPage + 1)}
                >
                  Next
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}

export default memo(PaginationUser);
