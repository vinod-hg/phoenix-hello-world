defmodule HelloWeb.RoomChannel do
  use Phoenix.Channel
  require Logger
  import Ecto.Query, only: [from: 2]

  @doc """
  Authorize socket to subscribe and broadcast events on this channel & topic

  Possible Return Values

  `{:ok, socket}` to authorize subscription for channel for requested topic

  `:ignore` to deny subscription/broadcast on this channel
  for the requested topic
  """
  def join("room:" <> room_name, message, socket) do
    Process.flag(:trap_exit, true)
    :timer.send_interval(5000, :ping)
    send(self(), {:after_join, room_name, message})
    # room = %Hello.Room{name: room_name, users: "unknown", data: ""}
    # case Hello.Repo.all(from r in Hello.Room, where: r.name == ^room_name, select: r) do
    #   [nil] ->
    #     Hello.Repo.insert(room)
    #   [oldroom] ->
    #     Hello.Repo.update(Hello.Room.changeset(oldroom, %{users: "unknown"}))
    #   dbreturn ->
    #     Logger.info"> Error in DB #{inspect dbreturn}"
    # end
    Logger.info"> joined #{inspect message}"
    {:ok, socket}
  end

  # def join("room:" <> _private_subtopic, message, _socket) do
  #   Logger.info"> error #{inspect message}"
  #   {:error, %{reason: "unauthorized"}}
  # end

  def handle_info({:after_join, _room_name, msg}, socket) do
    broadcast! socket, "user:entered", %{user: msg["user"]}
    #users = Hello.Repo.all(from r in Hello.Room, where: r.name == ^room_name, select: r.users)
    push socket, "join", %{status: "connected"}
    # Logger.info"> Joined user room data #{inspect users}"
    {:noreply, socket}
  end
  def handle_info(:ping, socket) do
    push socket, "new:msg", %{user: "SYSTEM", body: "ping"}
    {:noreply, socket}
  end

  def terminate(reason, _socket) do
    Logger.debug"> leave #{inspect reason}"
    :ok
  end

  def handle_in("new_msg", msg, socket) do
    # Logger.info"> received msg #{inspect msg}"
    broadcast! socket, "new_msg", %{user: msg["user"], body: msg["body"]}
    {:reply, {:ok, %{msg: msg["body"]}}, assign(socket, :user, msg["user"])}
  end
  def handle_in("message", %{"body" => body}, socket) do
    broadcast! socket, "message", %{body: body}
    {:noreply, socket}
  end

  intercept ["user_joined"]

  def handle_out("user_joined", msg, socket) do
    Logger.info"> user joined #{inspect msg}"
    if Accounts.ignoring_user?(socket.assigns[:user], msg.user_id) do
      {:noreply, socket}
    else
      push socket, "user_joined", msg
      {:noreply, socket}
    end
  end

end
