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
  def join("room:" <> room_name, msg, socket) do
    Process.flag(:trap_exit, true)
    user = msg["user"]
    socket = assign(socket, :room, room_name)
              |> assign(:user, user)
              |> assign(:client_counter, 0)
              |> assign(:new_msg_buffer, :ordsets.new())
    Hello.RoomOwnerSup.start_room(room_name)
    res = Hello.RoomOwner.new_user(room_name, user)
      # case Hello.Repo.all(from(r in Hello.Room, where: r.name == ^room_name, select: r)) do
      #   [] ->
      #     users = [user]
      #     room = %Hello.Room{name: room_name, users: Poison.encode!(users), data: "data"}
      #     Hello.Repo.insert(room)
      #     {:ok, users}
      #   [oldroom = %{users: oldusers}] ->
      #     oldusers = Poison.decode!(oldusers)
      #     Logger.info(">oldusers : #{inspect(oldusers)}")
      #     # TODO: Implement relogin check and handle accordingly
      #     # if :lists.member(user, oldusers) do
      #     #     {:error, %{reason: "User already connected"}}
      #     # else
      #     users = [user | oldusers]
      #     resp = Hello.Repo.update(Hello.Room.changeset(oldroom, %{users: Poison.encode!(users)}))
      #     Logger.info(">new users : #{inspect([users, resp])}")
      #     {:ok, users}
      #   # end
      #   dbreturn ->
      #     Logger.info("> Error in DB #{inspect(dbreturn)}")
      #     {:error, %{reason: "Internal error while fetching data from DB"}}
      # end
    case res do
      {:ok, users} ->
        :timer.send_interval(5000, :ping)
        send(self(), {:after_join, room_name, msg, users})
        Logger.info("> joined room:#{inspect(msg)}, user:#{inspect(msg)}")
        {:ok, socket}
      _ ->
        res
    end
  end

  # def join("room:" <> _private_subtopic, message, _socket) do
  #   Logger.info"> error #{inspect message}"
  #   {:error, %{reason: "unauthorized"}}
  # end

  def handle_info({:after_join, _room_name, msg, users}, socket) do
    broadcast_from!(socket, "user:new", %{user: msg["user"]})
    push(socket, "users", %{status: "connected", users: users})
    list = Hello.RoomOwner.get_all_msgs(socket.assigns[:room])
    Logger.info("> Msgs in queue #{inspect(users)}")
    Enum.each(list, fn {_counter, qmsg} ->
      push socket, "new_msg", qmsg
    end)
    Logger.info("> Joined user room data #{inspect(users)}")
    {:noreply, socket}
  end

  def handle_info(:ping, socket) do
    push(socket, "new:msg", %{user: "SYSTEM", body: "ping"})
    {:noreply, socket}
  end

  def terminate(reason, socket) do
    resp = Hello.RoomOwner.user_left(socket.assigns[:room], socket.assigns[:user])
    broadcast_from!(socket, "user:left", %{user: socket.assigns[:user]})
    Logger.info("> leave #{inspect([reason, resp])}")
    # case Hello.Repo.all(from(r in Hello.Room, where: r.name == ^socket.assigns[:room], select: r)) do
    #   [] ->
    #     Logger.info("User not in db #{inspect(reason)}")
    #     :ok
    #   [room = %{users: users}] ->
    #     users = Poison.decode!(users)
    #     Logger.info(">users : #{inspect(users)}")
    #     users = List.delete(users, socket.assigns[:user])
    #     resp = Hello.Repo.update(Hello.Room.changeset(room, %{users: Poison.encode!(users)}))
    #     Logger.info("> leave #{inspect([reason, resp])}")
    #     :ok
    #   # end
    #   dbreturn ->
    #     Logger.info("> Error in DB #{inspect(dbreturn)}")
    #     {:error, %{reason: "Internal error while fetching data from DB"}}
    # end
  end

  def handle_in("new_msg", msg, socket) do
    client_counter = socket.assigns[:client_counter]
    socket =
      if msg["counter"] == client_counter + 1 do
        counter = Hello.RoomOwner.new_msg(socket.assigns[:room], msg)
        Logger.info("In #{inspect [counter, msg["counter"], msg["body"]["text"]]}")
        broadcast_from!(socket, "new_msg", %{user: msg["user"], counter: counter, body: msg["body"]})
        socket = assign(socket, :client_counter, client_counter + 1)
        # take next msg from queue. Process if it is next message in queue
        case socket.assigns[:new_msg_buffer] do
          [{_, next_msg} | msg_buffer] ->
            socket = assign(socket, :new_msg_buffer, msg_buffer)
            {_, _, socket} = handle_in("new_msg", next_msg, socket)
            socket
          [] ->
            socket
        end
      else
        Logger.info("Queued #{inspect [client_counter, msg["counter"], msg["body"]["text"]]}")
        msg_buffer = socket.assigns[:new_msg_buffer]
        assign(socket, :new_msg_buffer, :ordsets.add_element({msg["counter"], msg}, msg_buffer))
      end
    {:reply, {:ok, %{msg: msg["body"]}}, socket}
  end

  def handle_in("msg:new", msg, socket) do
    broadcast_from!(socket, "msg:new", msg)
    {:noreply, socket}
  end

  intercept(["user_joined",
              "new_msg"])

  def handle_out("user_joined", msg, socket) do
    Logger.info("> user joined #{inspect(msg)}")

    # if Accounts.ignoring_user?(socket.assigns[:user], msg.user_id) do
    #   {:noreply, socket}
    # else
      push(socket, "user_joined", msg)
      {:noreply, socket}
    # end
  end

  # log the message order
  def handle_out("new_msg", msg, socket) do
    if socket.assigns[:user] == "vin1" do
      Logger.info("Out #{inspect [msg[:counter], msg[:body]["text"]]}")
    end
    if is_integer(socket.assigns[:counter]) and msg[:counter] != socket.assigns[:counter] + 1 do
      Logger.info("#{inspect [msg, socket.assigns[:user], socket.assigns[:counter]]}")
    end
    push socket, "new_msg", msg
    socket = assign(socket, :counter, socket.assigns[:counter])
    {:noreply, socket}
  end
end
