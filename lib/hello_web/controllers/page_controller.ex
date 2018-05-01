defmodule HelloWeb.PageController do
  use HelloWeb, :controller

  def index(conn, %{"room" => room, "user" => user}) do
    render conn, "index.html", room: room, user: user
  end
  # def index(conn, _params) do
  #   render conn, "index.html"
  # end
end
