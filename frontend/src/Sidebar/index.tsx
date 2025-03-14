import { setSidebar } from "@/modules/redux/actions";
import { useReduxAction, useReduxStore } from "@/modules/redux/hooks/base";
import { useRouteItems } from "@/Router";
import { CustomRouteObject, Route } from "@/Router/type";
import { BuildKey, Environment, pathJoin } from "@/utilities";
import { LOG } from "@/utilities/console";
import { useGotoHomepage } from "@/utilities/hooks";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import {
  createContext,
  FunctionComponent,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Badge,
  Collapse,
  Container,
  Image,
  ListGroup,
  ListGroupItem,
} from "react-bootstrap";
import {
  matchPath,
  NavLink,
  RouteObject,
  useLocation,
  useNavigate,
} from "react-router-dom";

const Selection = createContext<{
  selection: string | null;
  select: (path: string | null) => void;
}>({
  selection: null,
  select: () => {
    LOG("error", "Selection context not initialized");
  },
});

function useSelection() {
  return useContext(Selection);
}

function useBadgeValue(route: Route.Item) {
  const { badge, children } = route;
  return useMemo(() => {
    let value = badge ?? 0;

    if (children === undefined) {
      return value;
    }

    value +=
      children.reduce((acc, child: Route.Item) => {
        if (child.badge && child.hidden !== true) {
          return acc + (child.badge ?? 0);
        }
        return acc;
      }, 0) ?? 0;

    return value === 0 ? undefined : value;
  }, [badge, children]);
}

function useIsActive(parent: string, route: RouteObject) {
  const { path, children } = route;

  const { pathname } = useLocation();
  const root = useMemo(() => pathJoin(parent, path ?? ""), [parent, path]);

  const paths = useMemo(
    () => [root, ...(children?.map((v) => pathJoin(root, v.path ?? "")) ?? [])],
    [root, children]
  );

  const selection = useSelection().selection;
  return useMemo(
    () =>
      selection?.includes(root) ||
      paths.some((path) => matchPath(path, pathname)),
    [pathname, paths, root, selection]
  );
}

// Actual sidebar
const Sidebar: FunctionComponent = () => {
  const [selection, select] = useState<string | null>(null);
  const isShow = useReduxStore((s) => s.site.showSidebar);

  const showSidebar = useReduxAction(setSidebar);

  const goHome = useGotoHomepage();

  const routes = useRouteItems();

  const { pathname } = useLocation();
  useEffect(() => {
    select(null);
  }, [pathname]);

  return (
    <Selection.Provider value={{ selection, select }}>
      <nav className={clsx("sidebar-container", { open: isShow })}>
        <Container className="sidebar-title d-flex align-items-center d-md-none">
          <Image
            alt="brand"
            src={`${Environment.baseUrl}/static/logo64.png`}
            width="32"
            height="32"
            onClick={goHome}
            className="cursor-pointer"
          ></Image>
        </Container>
        <ListGroup variant="flush" style={{ paddingBottom: "16rem" }}>
          {routes.map((route, idx) => (
            <RouteItem
              key={BuildKey("nav", idx)}
              parent="/"
              route={route}
            ></RouteItem>
          ))}
        </ListGroup>
      </nav>
      <div
        className={clsx("sidebar-overlay", { open: isShow })}
        onClick={() => showSidebar(false)}
      ></div>
    </Selection.Provider>
  );
};

const RouteItem: FunctionComponent<{
  route: CustomRouteObject;
  parent: string;
}> = ({ route, parent }) => {
  const { children, name, path, icon, hidden, element } = route;

  const isValidated = useMemo(
    () =>
      element !== undefined ||
      children?.find((v) => v.index === true) !== undefined,
    [element, children]
  );

  const { select } = useSelection();

  const navigate = useNavigate();

  const link = useMemo(() => pathJoin(parent, path ?? ""), [parent, path]);

  const badge = useBadgeValue(route);

  const isOpen = useIsActive(parent, route);

  if (hidden === true) {
    return null;
  }

  // Ignore path if it is using match
  if (path === undefined || path.includes(":")) {
    return null;
  }

  if (children !== undefined) {
    const elements = children.map((child, idx) => (
      <RouteItem
        parent={link}
        key={BuildKey(link, "nav", idx)}
        route={child}
      ></RouteItem>
    ));

    if (name) {
      return (
        <div className={clsx("sidebar-collapse-box", { active: isOpen })}>
          <ListGroupItem
            action
            className={clsx("button", { active: isOpen })}
            onClick={() => {
              LOG("info", "clicked", link);

              if (isValidated) {
                navigate(link);
              }

              if (isOpen) {
                select(null);
              } else {
                select(link);
              }
            }}
          >
            <RouteItemContent
              name={name ?? link}
              icon={icon}
              badge={badge}
            ></RouteItemContent>
          </ListGroupItem>
          <Collapse in={isOpen}>
            <div className="indent">{elements}</div>
          </Collapse>
        </div>
      );
    } else {
      return <>{elements}</>;
    }
  } else {
    return (
      <NavLink
        to={link}
        className={({ isActive }) =>
          clsx("list-group-item list-group-item-action button sb-collapse", {
            active: isActive,
          })
        }
      >
        <RouteItemContent
          name={name ?? link}
          icon={icon}
          badge={badge}
        ></RouteItemContent>
      </NavLink>
    );
  }
};

interface ItemComponentProps {
  name: string;
  icon?: IconDefinition;
  badge?: number;
}

const RouteItemContent: FunctionComponent<ItemComponentProps> = ({
  icon,
  name,
  badge,
}) => {
  return (
    <>
      {icon && <FontAwesomeIcon size="1x" className="icon" icon={icon} />}
      <span className="d-flex flex-grow-1 justify-content-between">
        {name}
        <Badge variant="secondary" hidden={badge === undefined || badge === 0}>
          {badge}
        </Badge>
      </span>
    </>
  );
};

export default Sidebar;
